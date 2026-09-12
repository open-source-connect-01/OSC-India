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
  pull_request?: { url?: string; html_url?: string };
  closed_at?: string;
  created_at?: string;
}

/**
 * Returns GitHub API headers with optimal rate-limiting:
 * Prioritizes personal access token (GITHUB_ACCESS_TOKEN/PAT).
 * Falls back automatically to GitHub OAuth App Basic Auth (AUTH_GITHUB_ID/SECRET),
 * providing 5,000 req/hr core API and 30 req/min search API.
 */
function getGitHubAuthHeaders(): Record<string, string> {
  const token = process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PAT;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "OSC-India-Sync-Engine",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    const clientId = process.env.GITHUB_ID || process.env.AUTH_GITHUB_ID;
    const clientSecret = process.env.GITHUB_SECRET || process.env.AUTH_GITHUB_SECRET;
    if (clientId && clientSecret) {
      headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    }
  }
  return headers;
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
    .select("role, github")
    .eq("user_id", userId)
    .maybeSingle();

  if (userProfile) {
    userRole = userProfile.role || "contributor";
    isAdmin = Boolean(userRole === "admin" || userRole === "project-admin");
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
  const allowedSlugs = preFetchedAllowedSlugs || (await getDbAllowedRepoSlugs());

  // 4. Setup GitHub API headers with OAuth fallback for 5,000 req/hr
  const headers = getGitHubAuthHeaders();

  try {
    // 5. Fetch ALL Merged PRs targeted strictly to the 17 competition projects
    const repoFilter = Array.from(allowedSlugs).map((s) => `repo:${s}`).join(" ");
    const prItems: GitHubIssueItem[] = [];
    const seenPrIds = new Set<number | string>();
    let page = 1;

    while (page <= 10) {
      const prQuery = encodeURIComponent(`author:${handle} type:pr is:merged ${repoFilter}`);
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
    const linkedIssuesCache = new Map<string, GitHubIssueItem | null>();

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

    // 8.5. Upsert individual PRs into public.contributions & update public.leaderboard_stats
    try {
      const { data: dbProjects } = await admin.from("projects").select("id, github_repo_url");
      const projectMap = new Map<string, string>();
      for (const p of dbProjects || []) {
        const slug = p.github_repo_url.replace(/^https?:\/\/github\.com\//i, "").replace(/\/+$/, "").toLowerCase();
        projectMap.set(slug, p.id);
      }

      interface ContributionUpsertRow {
        user_id: string;
        project_id: string;
        type: string;
        github_url: string;
        status: string;
        points_awarded: number;
        contributed_at: string;
      }

      const contributionsToUpsert: ContributionUpsertRow[] = [];
      for (const pr of validPRs) {
        const projectId = projectMap.get(pr.repoSlug);
        if (projectId) {
          contributionsToUpsert.push({
            user_id: userId,
            project_id: projectId,
            type: "pr",
            github_url: pr.item.html_url,
            status: "merged",
            points_awarded: pr.points,
            contributed_at: pr.item.closed_at || pr.item.created_at || new Date().toISOString(),
          });
        }
      }

      if (contributionsToUpsert.length > 0) {
        await admin.from("contributions").upsert(contributionsToUpsert, { onConflict: "github_url" });
      }

      await admin.from("leaderboard_stats").upsert(
        {
          user_id: userId,
          total_points: totalScore,
          current_streak: 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch (contribErr: unknown) {
      console.warn("Notice: saving contributions in syncGitHubContribution:", contribErr instanceof Error ? contribErr.message : "Unknown error");
    }

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
        .eq("user_id", userId);
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
  } catch (err: unknown) {
    console.error("GitHub Sync Engine Exception:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error during sync." };
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

  // 1. Fetch allowed projects strictly from database (guaranteed 17 competition repos)
  const allowedSlugs = await getDbAllowedRepoSlugs();
  if (allowedSlugs.size === 0) {
    return { success: false, error: "No tracked projects found in database." };
  }

  // 2. Setup GitHub API headers with OAuth fallback for 5,000 req/hr
  const headers = getGitHubAuthHeaders();

  // 3. Fetch all contributors from auth.users (primary source of truth in production)
  interface SyncAuthUser {
    id: string;
    email?: string;
    user_metadata?: {
      github?: string;
      user_name?: string;
      preferred_username?: string;
      score?: number;
      merged_prs?: number;
      projects_count?: number;
      role?: string;
      is_admin?: boolean;
    };
    identities?: Array<{
      provider?: string;
      identity_data?: {
        user_name?: string;
        preferred_username?: string;
      };
    }>;
  }

  const authUsers: SyncAuthUser[] = [];
  try {
    let page = 1;
    while (true) {
      const { data: pageData, error: authErr } = await admin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (authErr || !pageData?.users || pageData.users.length === 0) break;
      authUsers.push(...(pageData.users as unknown as SyncAuthUser[]));
      if (pageData.users.length < 1000) break;
      page++;
    }
  } catch (err: unknown) {
    console.warn("Notice: reading auth.users during sync:", err instanceof Error ? err.message : "Unknown error");
  }

  // Pre-load projects to map repo slug -> project_id
  const { data: dbProjects } = await admin.from("projects").select("id, github_repo_url");
  const projectMap = new Map<string, string>();
  for (const p of dbProjects || []) {
    const slug = p.github_repo_url.replace(/^https?:\/\/github\.com\//i, "").replace(/\/+$/, "").toLowerCase();
    projectMap.set(slug, p.id);
  }

  // Map: normalized lowercase github handle -> array of valid merged PR items
  const contributorPrMap = new Map<
    string,
    Array<{
      repoSlug: string;
      prNumber: number;
      difficulty: DifficultyLevel;
      points: number;
      htmlUrl: string;
      mergedAt: string;
    }>
  >();

  const linkedIssuesCache = new Map<string, GitHubIssueItem | null>();
  let totalPrsFetched = 0;
  let totalMergedPrsFound = 0;

  function registerPr(
    rawAuthor: string,
    repoSlug: string,
    prNumber: number,
    diff: DifficultyLevel,
    htmlUrl: string,
    mergedAt: string
  ) {
    const authorHandle = normalizeGitHubHandle(rawAuthor || "").toLowerCase();
    if (!authorHandle || authorHandle.includes("[bot]")) return;

    if (!contributorPrMap.has(authorHandle)) {
      contributorPrMap.set(authorHandle, []);
    }
    const list = contributorPrMap.get(authorHandle)!;
    if (!list.some((p) => p.repoSlug === repoSlug && p.prNumber === prNumber)) {
      totalMergedPrsFound++;
      list.push({
        repoSlug,
        prNumber,
        difficulty: diff,
        points: DIFFICULTY_POINTS[diff],
        htmlUrl,
        mergedAt,
      });
    }
  }

  // 4. Primary Pass: Fast repo-centric sweep of all 17 competition projects via REST API
  for (const repoSlug of Array.from(allowedSlugs)) {
    try {
      const maxPages = repoSlug === "kanishjebamathewm/truxify" ? 10 : 5;
      let page = 1;
      while (page <= maxPages) {
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
          if (!pr.merged_at) continue;
          const rawAuthor = pr.user?.login;
          if (!rawAuthor) continue;

          // Detect difficulty
          let prDifficulty = detectDifficulty({
            title: pr.title,
            body: pr.body,
            labels: pr.labels,
          });

          // Check linked issues
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

          const prMergedAt = pr.merged_at || pr.closed_at || new Date().toISOString();
          registerPr(rawAuthor, repoSlug, pr.number, prDifficulty, pr.html_url, prMergedAt);
        }

        if (pulls.length < 100) break;
        page++;
      }
    } catch (repoErr: unknown) {
      console.error(`Error fetching PRs for repo ${repoSlug}:`, repoErr instanceof Error ? repoErr.message : "Unknown error");
    }
  }

  // 5. Secondary Pass: Multi-author batch search across registered handles to guarantee 100% PR capture
  try {
    const candidateHandles = new Set<string>();
    for (const user of authUsers) {
      const meta = user.user_metadata || {};
      const identities = user.identities || [];
      if (meta.github) candidateHandles.add(normalizeGitHubHandle(meta.github).toLowerCase());
      if (meta.user_name) candidateHandles.add(normalizeGitHubHandle(meta.user_name).toLowerCase());
      if (meta.preferred_username) candidateHandles.add(normalizeGitHubHandle(meta.preferred_username).toLowerCase());
      for (const id of identities) {
        if (id.provider === "github" && id.identity_data) {
          if (id.identity_data.user_name) candidateHandles.add(normalizeGitHubHandle(String(id.identity_data.user_name)).toLowerCase());
          if (id.identity_data.preferred_username) candidateHandles.add(normalizeGitHubHandle(String(id.identity_data.preferred_username)).toLowerCase());
        }
      }
    }

    const repoFilter = Array.from(allowedSlugs).map((s) => `repo:${s}`).join(" ");
    const uniqueHandles = Array.from(candidateHandles).filter(Boolean);
    for (let i = 0; i < uniqueHandles.length; i += 15) {
      const batch = uniqueHandles.slice(i, i + 15);
      const q = encodeURIComponent(`is:pr is:merged ${repoFilter} ${batch.map((h) => `author:${h}`).join(" ")}`);
      const searchRes = await fetch(`https://api.github.com/search/issues?q=${q}&per_page=100`, {
        headers,
        next: { revalidate: 0 },
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        for (const item of searchData.items || []) {
          const repoSlug = (extractRepoSlug(item.repository_url || item.html_url) || "").toLowerCase();
          if (repoSlug && allowedSlugs.has(repoSlug)) {
            const author = item.user?.login;
            if (author) {
              const diff = detectDifficulty(item);
              const itemMergedAt = item.closed_at || item.created_at || new Date().toISOString();
              registerPr(author, repoSlug, item.number, diff, item.html_url, itemMergedAt);
            }
          }
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  } catch (searchErr) {
    console.warn("Notice: batch search supplementary pass:", searchErr);
  }

  let updatedCount = 0;
  const nowIso = new Date().toISOString();
  const adminEmail = (process.env.ADMIN_PORTAL_EMAIL || "sayanghosh1887@gmail.com").toLowerCase();

  // 6. Update each contributor in auth.users and public.profiles
  for (const user of authUsers) {
    const meta = user.user_metadata || {};
    const identities = user.identities || [];
    const role = meta.role || (user.email?.toLowerCase() === adminEmail ? "admin" : "contributor");
    const isAdmin = Boolean(meta.is_admin || role === "admin" || role === "project-admin");

    // Only contributors participate in leaderboard scoring
    if (role !== "contributor" || isAdmin) {
      continue;
    }

    // Collect all handles that belong to this user
    const userHandles = new Set<string>();
    if (meta.github) userHandles.add(normalizeGitHubHandle(meta.github).toLowerCase());
    if (meta.user_name) userHandles.add(normalizeGitHubHandle(meta.user_name).toLowerCase());
    if (meta.preferred_username) userHandles.add(normalizeGitHubHandle(meta.preferred_username).toLowerCase());
    for (const id of identities) {
      if (id.provider === "github" && id.identity_data) {
        if (id.identity_data.user_name) userHandles.add(normalizeGitHubHandle(String(id.identity_data.user_name)).toLowerCase());
        if (id.identity_data.preferred_username) userHandles.add(normalizeGitHubHandle(String(id.identity_data.preferred_username)).toLowerCase());
      }
    }

    // Merge all PRs across the user's handles without duplication
    const mergedPrMap = new Map<string, { repoSlug: string; prNumber: number; difficulty: DifficultyLevel; points: number; htmlUrl: string; mergedAt: string }>();
    for (const handle of userHandles) {
      if (handle && contributorPrMap.has(handle)) {
        for (const pr of contributorPrMap.get(handle)!) {
          const key = `${pr.repoSlug}#${pr.prNumber}`;
          if (!mergedPrMap.has(key)) {
            mergedPrMap.set(key, pr);
          }
        }
      }
    }

    const userPrs = Array.from(mergedPrMap.values());
    const computedScore = userPrs.reduce((sum, p) => sum + p.points, 0);
    const computedMergedPrs = userPrs.length;
    const uniqueRepos = new Set(userPrs.map((p) => p.repoSlug));
    const computedProjects = uniqueRepos.size;

    const currentScore = Number(meta.score || 0);
    const currentPrs = Number(meta.merged_prs || 0);
    const currentRepos = Number(meta.projects_count || 0);

    const hasChanged =
      currentScore !== computedScore ||
      currentPrs !== computedMergedPrs ||
      currentRepos !== computedProjects;

    const primaryHandle = meta.github || meta.user_name || Array.from(userHandles)[0] || null;

    // Save individual PR contributions into public.contributions
    if (userPrs.length > 0) {
      interface ContribRow {
        user_id: string;
        project_id: string;
        type: string;
        github_url: string;
        status: string;
        points_awarded: number;
        contributed_at: string;
      }

      const contribRows: ContribRow[] = [];
      for (const p of userPrs) {
        const projId = projectMap.get(p.repoSlug);
        if (projId && p.htmlUrl) {
          contribRows.push({
            user_id: user.id,
            project_id: projId,
            type: "pr",
            github_url: p.htmlUrl,
            status: "merged",
            points_awarded: p.points,
            contributed_at: p.mergedAt,
          });
        }
      }

      if (contribRows.length > 0) {
        try {
          await admin.from("contributions").upsert(contribRows, { onConflict: "github_url" });
        } catch (cErr: unknown) {
          console.warn(`Notice: contributions batch save for ${user.id}:`, cErr instanceof Error ? cErr.message : "Unknown error");
        }
      }

      // Upsert into leaderboard_stats
      try {
        await admin.from("leaderboard_stats").upsert(
          {
            user_id: user.id,
            total_points: computedScore,
            current_streak: 1,
            updated_at: nowIso,
          },
          { onConflict: "user_id" }
        );
      } catch {}
    }

    // Update if values changed or if contributor has points
    if (hasChanged || computedScore > 0) {
      try {
        await admin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...meta,
            github: primaryHandle,
            score: computedScore,
            merged_prs: computedMergedPrs,
            projects_count: computedProjects,
          },
        });
      } catch (authErr: unknown) {
        console.warn(`Notice: updating auth metadata for ${user.id}:`, authErr instanceof Error ? authErr.message : "Unknown error");
      }

      // Also update profiles table if profile exists
      try {
        await admin
          .from("profiles")
          .update({
            github: primaryHandle,
            score: computedScore,
            merged_prs: computedMergedPrs,
            projects_count: computedProjects,
            updated_at: nowIso,
          })
          .eq("user_id", user.id);
      } catch {
        // Non-blocking
      }

      updatedCount++;
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
    contributorsProcessed: authUsers.length,
    activeContributorsWithPoints: Array.from(contributorPrMap.keys()).length,
    updatedProfiles: updatedCount,
    duration: `${durationSec}s`,
  };
}

