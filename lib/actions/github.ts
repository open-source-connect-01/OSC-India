"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getDbAllowedRepoSlugs } from "@/lib/actions/projects";
import {
  normalizeGitHubHandle,
  detectDifficulty,
  extractLinkedIssueNumbers,
  DIFFICULTY_POINTS,
  DIFFICULTY_RANK,
  DifficultyLevel,
} from "@/lib/utils/github-helpers";

interface GitHubIssueItem {
  number: number;
  title: string;
  body?: string | null;
  html_url: string;
  repository_url: string;
  labels?: Array<{ name: string }>;
  pull_request?: any;
}

/**
 * Main GitHub Sync Engine Implementation
 * Follows Workflow 2 from plan.md
 */
export async function syncGitHubContribution(userId: string, rawHandle: string) {
  const admin = createAdminClient();

  // 1. Normalize handle
  const handle = normalizeGitHubHandle(rawHandle);
  if (!handle) {
    return { success: false, error: "Invalid GitHub username provided." };
  }

  // 2. Check Role & Admin status safely
  let userRole = "contributor";
  let isAdmin = false;

  const { data: userProfile } = await admin
    .from("profiles")
    .select("role, is_admin, github, email")
    .eq("id", userId)
    .maybeSingle();

  if (userProfile) {
    userRole = userProfile.role || "contributor";
    isAdmin = Boolean(userProfile.is_admin || userProfile.role === "admin");
  } else {
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      if (authUser?.user?.user_metadata) {
        userRole = authUser.user.user_metadata.role || "contributor";
        isAdmin = Boolean(authUser.user.user_metadata.is_admin || userRole === "admin");
      }
    } catch {
      // fallback
    }
  }

  // 3. Extract Allowed Repositories strictly from the database (public.projects table)
  const allowedSlugs = await getDbAllowedRepoSlugs(admin);

  // 4. Fetch GitHub Data via Search API
  const token = process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PAT;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "OSC-India-Sync-Engine",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    // Query A: author:{handle} type:pr is:closed (or is:merged)
    const prQuery = encodeURIComponent(`author:${handle} type:pr is:closed`);
    const prResponse = await fetch(`https://api.github.com/search/issues?q=${prQuery}&per_page=100`, {
      headers,
      next: { revalidate: 0 },
    });

    if (!prResponse.ok) {
      const errText = await prResponse.text();
      console.error("GitHub PR search error:", errText);
      return { success: false, error: `GitHub API error: ${prResponse.statusText}` };
    }

    const prData = await prResponse.json();
    const prItems: GitHubIssueItem[] = prData.items || [];

    // Query B: assignee:{handle} type:issue is:closed
    const issueQuery = encodeURIComponent(`assignee:${handle} type:issue is:closed`);
    const issueResponse = await fetch(`https://api.github.com/search/issues?q=${issueQuery}&per_page=100`, {
      headers,
      next: { revalidate: 0 },
    });

    let issueItems: GitHubIssueItem[] = [];
    if (issueResponse.ok) {
      const issueData = await issueResponse.json();
      issueItems = issueData.items || [];
    }

    // Map issues by repoSlug + issue number for fast O(1) lookup (only for allowed DB projects)
    const issuesMap = new Map<string, GitHubIssueItem>();
    for (const issue of issueItems) {
      const repoSlug = issue.repository_url
        .replace(/^https?:\/\/api\.github\.com\/repos\//i, "")
        .replace(/\/+$/, "")
        .toLowerCase();
      if (allowedSlugs.has(repoSlug)) {
        issuesMap.set(`${repoSlug}#${issue.number}`, issue);
      }
    }

    // 5. Filter: Only keep PRs matching the allowed projects in the database
    const validPRs: Array<{
      item: GitHubIssueItem;
      repoSlug: string;
      difficulty: DifficultyLevel;
      points: number;
    }> = [];

    const contributedRepos = new Set<string>();

    for (const pr of prItems) {
      const repoSlug = pr.repository_url
        .replace(/^https?:\/\/api\.github\.com\/repos\//i, "")
        .replace(/\/+$/, "")
        .toLowerCase();

      // Only accept PRs on projects that exist in the database
      if (!allowedSlugs.has(repoSlug)) {
        continue;
      }

      // Base difficulty from PR labels/title/body
      let prDifficulty = detectDifficulty(pr);

      // 6. Linked Issue Inheritance
      const linkedNumbers = extractLinkedIssueNumbers(`${pr.title} ${pr.body || ""}`);
      for (const num of linkedNumbers) {
        const linkedIssue = issuesMap.get(`${repoSlug}#${num}`);
        if (linkedIssue) {
          const issueDifficulty = detectDifficulty(linkedIssue);
          if (DIFFICULTY_RANK[issueDifficulty] > DIFFICULTY_RANK[prDifficulty]) {
            prDifficulty = issueDifficulty; // Inherit higher difficulty
          }
        }
      }

      contributedRepos.add(repoSlug);
      validPRs.push({
        item: pr,
        repoSlug,
        difficulty: prDifficulty,
        points: DIFFICULTY_POINTS[prDifficulty],
      });
    }

    // 7. Compute Score: (easy * 10) + (med * 20) + (hard * 30) + (exp * 50)
    let totalScore = 0;
    const isContributor = userRole === "contributor" && !isAdmin;
    if (isContributor) {
      for (const pr of validPRs) {
        totalScore += pr.points;
      }
    }

    const mergedPrsCount = validPRs.length;
    const projectsCount = contributedRepos.size;

    // 8. Update Supabase Auth user_metadata (unconditional resilience)
    try {
      const { data: userData } = await admin.auth.admin.getUserById(userId);
      if (userData?.user) {
        await admin.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...userData.user.user_metadata,
            github: handle,
            score: totalScore,
            merged_prs: mergedPrsCount,
            projects_count: projectsCount,
          },
        });
      }
    } catch (authErr) {
      console.warn("Notice: saving synced metrics to auth metadata:", authErr);
    }

    // 9. Update Supabase profiles table (by userId and by email)
    try {
      await admin
        .from("profiles")
        .update({
          github: handle,
          score: totalScore,
          merged_prs: mergedPrsCount,
          projects_count: projectsCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (userProfile?.email) {
        await admin
          .from("profiles")
          .update({
            github: handle,
            score: totalScore,
            merged_prs: mergedPrsCount,
            projects_count: projectsCount,
            updated_at: new Date().toISOString(),
          })
          .ilike("email", userProfile.email);
      }
    } catch (dbErr) {
      console.warn("Notice: profile update after GitHub sync:", dbErr);
    }

    return {
      success: true,
      handle,
      score: totalScore,
      merged_prs: mergedPrsCount,
      projects_count: projectsCount,
      breakdown: {
        easy: validPRs.filter((p) => p.difficulty === "easy").length,
        medium: validPRs.filter((p) => p.difficulty === "medium").length,
        hard: validPRs.filter((p) => p.difficulty === "hard").length,
        expert: validPRs.filter((p) => p.difficulty === "expert").length,
      },
    };
  } catch (err: any) {
    console.error("GitHub Sync Engine Exception:", err);
    return { success: false, error: err.message || "Unknown error during sync." };
  }
}
