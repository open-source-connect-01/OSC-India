"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getDbAllowedRepoSlugs } from "@/lib/actions/projects";
import { revalidatePath } from "next/cache";
import {
  normalizeGitHubHandle,
  detectDifficulty,
  extractLinkedIssueNumbers,
  extractRepoSlug,
  DIFFICULTY_POINTS,
  DIFFICULTY_RANK,
  DifficultyLevel,
} from "@/lib/utils/github-helpers";

interface GitHubIssueItem {
  id?: number;
  number: number;
  title: string;
  body?: string | null;
  html_url: string;
  repository_url?: string;
  labels?: Array<{ name: string }>;
  pull_request?: any;
}

/**
 * Core GitHub Sync Engine Implementation.
 * Queries GitHub Search API for merged PRs authored by the user,
 * filters against the projects in the Supabase database, computes points based on difficulty,
 * and updates public.profiles and auth user_metadata.
 */
export async function syncGitHubContribution(
  userId: string,
  rawHandle: string,
  preFetchedAllowedSlugs?: Set<string>
) {
  const admin = createAdminClient();

  // 1. Normalize handle
  const handle = normalizeGitHubHandle(rawHandle);
  if (!handle) {
    return { success: false, error: "Invalid GitHub username provided." };
  }

  // 2. Check Role & Admin status safely - early exit if not a contributor
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

  // Only contributors participate in scoring. Skip admins/mentors to conserve API quota.
  if (userRole !== "contributor" || isAdmin) {
    return {
      success: true,
      skipped: true,
      role: userRole,
      message: `User is ${userRole}, skipping GitHub contribution scoring.`,
      score: 0,
      merged_prs: 0,
      projects_count: 0,
    };
  }

  // 3. Extract Allowed Repositories strictly from the database (public.projects table)
  const allowedSlugs = preFetchedAllowedSlugs || (await getDbAllowedRepoSlugs(admin));

  // 4. Setup GitHub API headers
  const token = process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PAT;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "OSC-India-Sync-Engine",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    // 5. Fetch ALL Merged PRs via Search API with Pagination
    // Note: is:merged only returns actually merged PRs (not closed/rejected ones)
    const prItems: GitHubIssueItem[] = [];
    const seenPrIds = new Set<number | string>();
    let page = 1;

    while (page <= 10) {
      const prQuery = encodeURIComponent(`author:${handle} type:pr is:merged`);
      const prResponse = await fetch(
        `https://api.github.com/search/issues?q=${prQuery}&per_page=100&page=${page}`,
        {
          headers,
          next: { revalidate: 0 },
        }
      );

      if (!prResponse.ok) {
        if (prResponse.status === 403 || prResponse.status === 429) {
          const resetTime = prResponse.headers.get("x-ratelimit-reset");
          console.warn(`GitHub Search API rate limit reached during sync for @${handle}. Status: ${prResponse.status}`);
          return {
            success: false,
            rateLimited: true,
            error: "GitHub Search API rate limit exceeded.",
            resetTime: resetTime ? Number(resetTime) : undefined,
          };
        }
        const errText = await prResponse.text();
        console.error(`GitHub PR search error for @${handle}:`, errText);
        return { success: false, error: `GitHub API error: ${prResponse.statusText}` };
      }

      const prData = await prResponse.json();
      const items: GitHubIssueItem[] = prData.items || [];

      for (const item of items) {
        const uniqueKey = item.id || `${item.number}-${item.html_url}`;
        if (!seenPrIds.has(uniqueKey)) {
          seenPrIds.add(uniqueKey);
          prItems.push(item);
        }
      }

      // If page had fewer than 100 items or we collected all total results, done
      if (items.length < 100 || prItems.length >= (prData.total_count || 0)) {
        break;
      }

      page++;
    }

    // 6. Filter: Only keep PRs matching the allowed projects in the database
    const validPRs: Array<{
      item: GitHubIssueItem;
      repoSlug: string;
      difficulty: DifficultyLevel;
      points: number;
    }> = [];

    const contributedRepos = new Set<string>();
    const linkedIssuesCache = new Map<string, any>();

    for (const pr of prItems) {
      let repoSlug = "";
      if (pr.repository_url) {
        repoSlug = pr.repository_url
          .replace(/^https?:\/\/api\.github\.com\/repos\//i, "")
          .replace(/\/+$/, "")
          .toLowerCase();
      }
      if (!repoSlug && pr.html_url) {
        repoSlug = extractRepoSlug(pr.html_url) || "";
      }

      // Only accept PRs on projects that exist in the database
      if (!repoSlug || !allowedSlugs.has(repoSlug)) {
        continue;
      }

      // Base difficulty from PR labels/title/body
      let prDifficulty = detectDifficulty(pr);

      // 7. Linked Issue Inheritance via REST API (uses core 5,000 req/hr rate limit)
      const linkedNumbers = extractLinkedIssueNumbers(`${pr.title} ${pr.body || ""}`);
      for (const num of linkedNumbers) {
        const cacheKey = `${repoSlug}#${num}`;
        let linkedIssue = linkedIssuesCache.get(cacheKey);

        if (linkedIssue === undefined) {
          try {
            const issueRes = await fetch(
              `https://api.github.com/repos/${repoSlug}/issues/${num}`,
              { headers, next: { revalidate: 0 } }
            );
            if (issueRes.ok) {
              linkedIssue = await issueRes.json();
              linkedIssuesCache.set(cacheKey, linkedIssue);
            } else {
              linkedIssuesCache.set(cacheKey, null);
            }
          } catch {
            linkedIssuesCache.set(cacheKey, null);
          }
        }

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

    // 8. Compute Score: sum of points for all valid merged PRs
    let totalScore = 0;
    for (const pr of validPRs) {
      totalScore += pr.points;
    }

    const mergedPrsCount = validPRs.length;
    const projectsCount = contributedRepos.size;

    // 9. Update Supabase Auth user_metadata (unconditional resilience)
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

    // 10. Update Supabase profiles table for this exact user
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

/**
 * Fast, repo-centric full sync engine for the 5-hour cron job loop.
 * Rather than making 608 individual Search API queries (which exceeds the 30 req/min limit),
 * this queries closed pull requests directly across the official tracked repositories
 * using the core GitHub REST API (5,000 req/hr rate limit).
 * 
 * Aggregates merged PRs for all contributors across all competition projects in seconds,
 * computes difficulty points and repo counts, and updates all 608 profiles in public.profiles.
 */
export async function syncAllProjectsAndContributors() {
  const admin = createAdminClient();
  const startTime = Date.now();

  // 1. Fetch allowed projects strictly from database
  const allowedSlugs = await getDbAllowedRepoSlugs(admin);
  if (allowedSlugs.size === 0) {
    return { success: false, error: "No tracked projects found in database." };
  }

  // 2. Setup GitHub API headers
  const token = process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PAT;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "OSC-India-Sync-Engine",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Map: normalized lowercase github handle -> array of valid merged PR items
  const contributorPrMap = new Map<
    string,
    Array<{
      repoSlug: string;
      prNumber: number;
      difficulty: DifficultyLevel;
      points: number;
    }>
  >();

  const linkedIssuesCache = new Map<string, any>();
  let totalPrsFetched = 0;
  let totalMergedPrsFound = 0;

  // 3. For each competition project repository, fetch closed PRs via REST API
  for (const repoSlug of Array.from(allowedSlugs)) {
    try {
      let page = 1;
      while (page <= 5) {
        const url = `https://api.github.com/repos/${repoSlug}/pulls?state=closed&per_page=100&page=${page}&sort=updated&direction=desc`;
        const res = await fetch(url, { headers, next: { revalidate: 0 } });

        if (!res.ok) {
          if (res.status === 403 || res.status === 429) {
            console.warn(`Rate limit reached on ${repoSlug}: status ${res.status}`);
          }
          break;
        }

        const pulls = await res.json();
        if (!Array.isArray(pulls) || pulls.length === 0) {
          break;
        }

        totalPrsFetched += pulls.length;

        for (const pr of pulls) {
          // Only truly merged PRs count!
          if (!pr.merged_at) continue;

          const rawAuthor = pr.user?.login;
          const authorHandle = normalizeGitHubHandle(rawAuthor || "").toLowerCase();
          if (!authorHandle) continue;

          totalMergedPrsFound++;

          // Detect difficulty from labels / title / body
          let prDifficulty = detectDifficulty({
            title: pr.title,
            body: pr.body,
            labels: pr.labels,
          });

          // Check linked issues in this repo
          const linkedNumbers = extractLinkedIssueNumbers(`${pr.title} ${pr.body || ""}`);
          for (const num of linkedNumbers) {
            const cacheKey = `${repoSlug}#${num}`;
            let linkedIssue = linkedIssuesCache.get(cacheKey);

            if (linkedIssue === undefined) {
              try {
                const issueRes = await fetch(
                  `https://api.github.com/repos/${repoSlug}/issues/${num}`,
                  { headers, next: { revalidate: 0 } }
                );
                if (issueRes.ok) {
                  linkedIssue = await issueRes.json();
                  linkedIssuesCache.set(cacheKey, linkedIssue);
                } else {
                  linkedIssuesCache.set(cacheKey, null);
                }
              } catch {
                linkedIssuesCache.set(cacheKey, null);
              }
            }

            if (linkedIssue) {
              const issueDifficulty = detectDifficulty(linkedIssue);
              if (DIFFICULTY_RANK[issueDifficulty] > DIFFICULTY_RANK[prDifficulty]) {
                prDifficulty = issueDifficulty;
              }
            }
          }

          const prEntry = {
            repoSlug,
            prNumber: pr.number,
            difficulty: prDifficulty,
            points: DIFFICULTY_POINTS[prDifficulty],
          };

          if (!contributorPrMap.has(authorHandle)) {
            contributorPrMap.set(authorHandle, []);
          }
          contributorPrMap.get(authorHandle)!.push(prEntry);
        }

        if (pulls.length < 100) break;
        page++;
      }
    } catch (repoErr: any) {
      console.error(`Error fetching PRs for repo ${repoSlug}:`, repoErr?.message);
    }
  }

  // 4. Fetch all contributor profiles from public.profiles
  const { data: profiles, error: profErr } = await admin
    .from("profiles")
    .select("id, github, role, score, merged_prs, projects_count")
    .eq("role", "contributor");

  if (profErr || !profiles) {
    return { success: false, error: profErr?.message || "Failed to fetch profiles." };
  }

  let updatedCount = 0;
  const nowIso = new Date().toISOString();

  // 5. Update each contributor profile in Supabase
  for (const profile of profiles) {
    if (!profile.github) continue;
    const cleanHandle = normalizeGitHubHandle(profile.github).toLowerCase();
    const userPrs = contributorPrMap.get(cleanHandle) || [];

    const computedScore = userPrs.reduce((sum, p) => sum + p.points, 0);
    const computedMergedPrs = userPrs.length;
    const uniqueRepos = new Set(userPrs.map((p) => p.repoSlug));
    const computedProjects = uniqueRepos.size;

    const hasChanged =
      profile.score !== computedScore ||
      profile.merged_prs !== computedMergedPrs ||
      profile.projects_count !== computedProjects;

    try {
      await admin
        .from("profiles")
        .update({
          score: computedScore,
          merged_prs: computedMergedPrs,
          projects_count: computedProjects,
          updated_at: nowIso,
        })
        .eq("id", profile.id);

      // If user has points or their score changed, update auth user_metadata as well
      if (hasChanged || computedScore > 0) {
        try {
          const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
          if (authUser?.user) {
            await admin.auth.admin.updateUserById(profile.id, {
              user_metadata: {
                ...authUser.user.user_metadata,
                score: computedScore,
                merged_prs: computedMergedPrs,
                projects_count: computedProjects,
              },
            });
          }
        } catch {
          // ignore
        }
      }

      updatedCount++;
    } catch (updateErr) {
      console.warn(`Failed to update profile for @${cleanHandle}:`, updateErr);
    }
  }

  revalidatePath("/leaderboard");
  revalidatePath("/admin");
  revalidatePath("/dashboard");

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  return {
    success: true,
    trackedRepos: allowedSlugs.size,
    totalPrsFetched,
    totalMergedPrsFound,
    contributorsProcessed: profiles.length,
    activeContributorsWithPoints: Array.from(contributorPrMap.keys()).length,
    updatedProfiles: updatedCount,
    duration: `${durationSec}s`,
  };
}

