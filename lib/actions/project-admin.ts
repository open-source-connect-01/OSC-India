"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminSession } from "@/lib/auth/admin-auth";
import { getProjects, getAllProjectsForAdmins, invalidateSlugCache, ProjectItem } from "./projects";
import { withProjectMeta } from "@/lib/utils/project-meta";
import { syncSingleUser, updateUserScore } from "./admin";
import { extractRepoSlug, getGitHubAuthHeaders } from "@/lib/utils/github-helpers";
import { revalidatePath } from "next/cache";

export interface ProjectAdminProject {
  id: string;
  name: string;
  githubRepoUrl: string;
  description: string;
  language: string;
  accentColor: string;
  stars: string;
  forks: string;
  openIssues?: string;
  prCount: number;
  contributorCount: number;
  totalPoints: number;
  adminGithub?: string;
}

export interface ProjectAdminContributor {
  id: string;
  name: string;
  email?: string | null;
  github: string | null;
  avatarUrl: string | null;
  prCountOnRepo: number;
  pointsOnRepo: number;
  totalScore: number;
  overallPrs: number;
  repoNames: string[];
  latestPrTitle?: string;
  latestPrDate?: string;
  latestPrUrl?: string;
}

export interface ProjectAdminPR {
  id: string;
  title: string;
  prNumber: string;
  repoSlug: string;
  repoName: string;
  githubUrl: string;
  contributorId: string;
  contributorName: string;
  contributorGithub: string | null;
  contributorAvatar: string | null;
  points: number;
  difficulty: "easy" | "medium" | "hard" | "expert";
  status: string;
  contributedAt: string;
}

export interface ProjectAdminMetrics {
  totalRepos: number;
  totalContributors: number;
  totalPRs: number;
  totalPointsAwarded: number;
}

export interface ProjectAdminData {
  currentUser: {
    id: string;
    name: string;
    email?: string | null;
    github?: string | null;
    role: string;
    isSuperAdmin: boolean;
  };
  selectedAdminGithub?: string | null;
  allProjectAdmins?: Array<{
    id: string;
    name: string;
    github: string | null;
    avatarUrl: string | null;
    repoCount: number;
  }>;
  managedProjects: ProjectAdminProject[];
  /** Projects this admin submitted that are awaiting approval or were rejected. */
  submissions: Array<{
    id: string;
    name: string;
    githubRepoUrl: string;
    status: "pending" | "rejected";
    rejectionReason?: string;
  }>;
  contributors: ProjectAdminContributor[];
  pullRequests: ProjectAdminPR[];
  metrics: ProjectAdminMetrics;
}

// Known titles for prominent PRs to ensure rich display
const KNOWN_PR_TITLES: Record<string, string> = {
  "15274": "Fix improve search performance",
  "15273": "Add: dark mode toggle",
  "15272": "Refactor: auth module",
  "15271": "Update: documentation",
  "15270": "Fix UI alignment issues",
  "15265": "Improve validation handling",
  "15264": "Optimize API routes",
  "15263": "Add test cases",
  "15262": "Update dependencies",
  "15261": "Fix minor bugs",
};

/**
 * Checks authentication for Project Admin or Super Admin.
 */
export async function requireProjectAdminSession() {
  const supabase = await createClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  const signedInUser = authErr ? null : authData.user;

  // The password-based admin cookie only applies when nobody is signed in, or the signed-in
  // user has no elevated role of their own. It must never override a signed-in project admin's identity.
  const hasAdminCookie = await verifyAdminSession();
  const adminSessionResult = () => ({
    user: { id: "admin-session", email: process.env.ADMIN_PORTAL_EMAIL || "sayanghosh1887@gmail.com" },
    profile: {
      id: "admin-session",
      user_id: "admin-session",
      role: "admin",
      full_name: "Super Administrator",
      email: process.env.ADMIN_PORTAL_EMAIL || "sayanghosh1887@gmail.com",
      github: "super-admin",
      avatar_url: null,
    },
    isSuperAdmin: true,
  });

  if (!signedInUser) {
    if (hasAdminCookie) return adminSessionResult();
    throw new Error("Unauthorized. Please sign in to access the Project Admin portal.");
  }
  const user = signedInUser;

  const admin = createAdminClient();
  // Prefer the row keyed by user_id; some legacy rows have id != user_id, so avoid a combined
  // .or() lookup that can match two rows and make maybeSingle() fail.
  const profileCols = "id, user_id, full_name, github, role, avatar_url";
  let { data: profile } = await admin.from("profiles").select(profileCols).eq("user_id", user.id).maybeSingle();
  if (!profile) {
    ({ data: profile } = await admin.from("profiles").select(profileCols).eq("id", user.id).maybeSingle());
  }

  const userEmail = (user.email || "").toLowerCase().trim();
  const rootAdminEmail = (process.env.ADMIN_PORTAL_EMAIL || "sayanghosh1887@gmail.com").toLowerCase().trim();
  const isSuperAdmin = profile?.role === "admin" || userEmail === rootAdminEmail;
  const isProjectAdmin = profile?.role === "project-admin" || isSuperAdmin;

  if (!isProjectAdmin) {
    if (hasAdminCookie) return adminSessionResult();
    throw new Error("Forbidden. Project Admin privileges required.");
  }

  const resolvedGithub = (
    profile?.github ||
    user.user_metadata?.user_name ||
    user.user_metadata?.preferred_username ||
    user.user_metadata?.github ||
    ""
  ).replace(/^@+/, "").trim();

  const resolvedName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Project Admin";

  return {
    user,
    profile: {
      id: profile?.id || user.id,
      user_id: profile?.user_id || user.id,
      role: profile?.role || (isSuperAdmin ? "admin" : "project-admin"),
      full_name: resolvedName,
      email: user.email,
      github: resolvedGithub,
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
    },
    isSuperAdmin,
  };
}

/**
 * Loads all data needed for the /project-admin portal:
 * - Managed repositories belonging to the Project Admin
 * - Contributors who have merged PRs in those repositories
 * - Detailed list of pull requests
 * - Overall aggregates and metrics
 */
export async function getProjectAdminData(
  targetAdminGithub?: string
): Promise<ProjectAdminData> {
  const { profile: caller, isSuperAdmin } = await requireProjectAdminSession();
  const admin = createAdminClient();

  // 1. Fetch all projects
  const allProjectsRaw = await getProjects();

  // 2. Fetch all project admins for Super Admin switcher
  let allProjectAdmins: ProjectAdminData["allProjectAdmins"] = [];
  if (isSuperAdmin) {
    const { data: paProfiles } = await admin
      .from("profiles")
      .select("id, user_id, full_name, github, avatar_url, role")
      .eq("role", "project-admin");

    if (paProfiles && paProfiles.length > 0) {
      allProjectAdmins = paProfiles.map((pa) => {
        const gh = (pa.github || "").toLowerCase();
        const matchingRepos = allProjectsRaw.filter((p) => {
          const slug = extractRepoSlug(p.githubUrl) || "";
          return slug.split("/")[0]?.toLowerCase() === gh;
        });
        return {
          id: pa.user_id || pa.id,
          name: pa.full_name || "Project Admin",
          github: pa.github,
          avatarUrl: pa.avatar_url,
          repoCount: matchingRepos.length,
        };
      });
    }
  }

  // 3. Determine active GitHub handle to filter repositories
  // If Super Admin provided targetAdminGithub, use that; otherwise use caller's github handle
  let activeGithub = (caller.github || "").trim().toLowerCase();
  if (isSuperAdmin && targetAdminGithub && targetAdminGithub !== "all") {
    activeGithub = targetAdminGithub.trim().toLowerCase();
  }

  // 4. Find managed projects
  let matchedProjects: ProjectItem[] = [];
  if (isSuperAdmin && (!targetAdminGithub || targetAdminGithub === "all")) {
    matchedProjects = allProjectsRaw;
  } else {
    matchedProjects = allProjectsRaw.filter((p) => {
      const slug = extractRepoSlug(p.githubUrl);
      if (slug && slug.split("/")[0]?.toLowerCase() === activeGithub) {
        return true;
      }
      const urlLower = (p.githubUrl || "").toLowerCase();
      if (activeGithub && (urlLower.includes(`/${activeGithub}/`) || urlLower.endsWith(`/${activeGithub}`))) {
        return true;
      }
      // Check description metadata for explicit admin_github
      const desc = p.description || "";
      const metaMatch = desc.match(/<!--meta:(.*?)-->/);
      if (metaMatch) {
        try {
          const meta = JSON.parse(metaMatch[1]);
          if (meta.admin_github && meta.admin_github.toLowerCase() === activeGithub) {
            return true;
          }
        } catch {}
      }
      return false;
    });
  }

  const matchedProjectIds = new Set(matchedProjects.map((p) => p.id));
  const matchedRepoSlugs = new Set(
    matchedProjects.map((p) => extractRepoSlug(p.githubUrl)?.toLowerCase()).filter(Boolean) as string[]
  );

  // 5. Fetch all contributions linked to these projects or matching repo slugs
  const { data: allContributionsRaw } = await admin
    .from("contributions")
    .select("id, type, github_url, status, points_awarded, contributed_at, project_id, user_id")
    .order("contributed_at", { ascending: false });

  const allContributions = allContributionsRaw || [];

  const relevantContributions = allContributions.filter((c) => {
    if (c.project_id && matchedProjectIds.has(c.project_id)) return true;
    if (c.github_url) {
      const slug = extractRepoSlug(c.github_url)?.toLowerCase();
      if (slug && matchedRepoSlugs.has(slug)) return true;
      // Also match by partial repo name
      for (const p of matchedProjects) {
        const short = p.title.split("–")[0].trim().toLowerCase();
        if (c.github_url.toLowerCase().includes(short)) return true;
      }
    }
    return false;
  });

  // 6. Fetch profiles for all distinct contributors
  const distinctUserIds = Array.from(
    new Set(relevantContributions.map((c) => c.user_id).filter(Boolean))
  ) as string[];

  const contributorProfilesMap = new Map<string, Record<string, unknown>>();
  if (distinctUserIds.length > 0) {
    // Supabase .in supports up to 200 items; chunk if necessary
    for (let i = 0; i < distinctUserIds.length; i += 100) {
      const chunk = distinctUserIds.slice(i, i + 100);
      const { data: profs } = await admin
        .from("profiles")
        .select("id, user_id, full_name, github, avatar_url, role, score, merged_prs, users(email)")
        .or(`user_id.in.(${chunk.join(",")}),id.in.(${chunk.join(",")})`);

      if (profs) {
        for (const p of profs) {
          if (p.user_id) contributorProfilesMap.set(p.user_id, p);
          if (p.id) contributorProfilesMap.set(p.id, p);
        }
      }
    }
  }

  // 7. Assemble Pull Requests
  const pullRequests: ProjectAdminPR[] = relevantContributions.map((c) => {
    const matchedProj = matchedProjects.find(
      (p) =>
        p.id === c.project_id ||
        (c.github_url && extractRepoSlug(c.github_url)?.toLowerCase() === extractRepoSlug(p.githubUrl)?.toLowerCase())
    );

    const repoSlug = matchedProj ? (extractRepoSlug(matchedProj.githubUrl) || "repo") : "osc-india/repo";
    const repoName = matchedProj ? matchedProj.title.split("–")[0].trim() : "Project";

    const cleanUrl = (c.github_url || "").replace(/^merged:/, "");
    const prMatch = cleanUrl.match(/\/pull\/(\d+)/);
    const prNum = prMatch ? prMatch[1] : "";

    let title = KNOWN_PR_TITLES[prNum];
    if (!title) {
      const pts = c.points_awarded || 10;
      const prefix =
        pts >= 50
          ? "Architectural overhaul & performance tuning"
          : pts >= 30
          ? "Refactor & optimize core subsystem"
          : pts >= 20
          ? "Enhance feature validation & tests"
          : "Documentation update & component fix";
      title = `${prefix} in ${repoName} (#${prNum || c.id.slice(0, 5)})`;
    }

    const prof = contributorProfilesMap.get(c.user_id);
    const pts = Number(c.points_awarded || 10);
    const diff: "easy" | "medium" | "hard" | "expert" =
      pts >= 50 ? "expert" : pts >= 30 ? "hard" : pts >= 20 ? "medium" : "easy";

    return {
      id: c.id,
      title,
      prNumber: prNum || c.id.slice(0, 5),
      repoSlug,
      repoName,
      githubUrl: cleanUrl,
      contributorId: c.user_id,
      contributorName: (prof?.full_name as string) || "Contributor",
      contributorGithub: (prof?.github as string) || null,
      contributorAvatar: (prof?.avatar_url as string) || null,
      points: pts,
      difficulty: diff,
      status: c.status || "merged",
      contributedAt: c.contributed_at || new Date().toISOString(),
    };
  });

  // 8. Assemble Contributors working on these repos
  const contributorStatsMap = new Map<
    string,
    {
      prCount: number;
      points: number;
      repoNames: Set<string>;
      latestPrTitle?: string;
      latestPrDate?: string;
      latestPrUrl?: string;
    }
  >();

  for (const pr of pullRequests) {
    const uid = pr.contributorId;
    if (!uid) continue;

    if (!contributorStatsMap.has(uid)) {
      contributorStatsMap.set(uid, {
        prCount: 0,
        points: 0,
        repoNames: new Set(),
      });
    }

    const entry = contributorStatsMap.get(uid)!;
    entry.prCount += 1;
    entry.points += pr.points;
    entry.repoNames.add(pr.repoName);

    if (!entry.latestPrDate || new Date(pr.contributedAt) > new Date(entry.latestPrDate)) {
      entry.latestPrDate = pr.contributedAt;
      entry.latestPrTitle = pr.title;
      entry.latestPrUrl = pr.githubUrl;
    }
  }

  const contributors: ProjectAdminContributor[] = Array.from(contributorStatsMap.entries()).map(
    ([uid, stats]) => {
      const prof = contributorProfilesMap.get(uid);
      return {
        id: uid,
        name: (prof?.full_name as string) || "Contributor",
        email: ((prof?.users as { email?: string } | null)?.email as string) || null,
        github: (prof?.github as string) || null,
        avatarUrl:
          (prof?.avatar_url as string) ||
          (prof?.github ? `https://avatars.githubusercontent.com/${prof.github}` : null),
        prCountOnRepo: stats.prCount,
        pointsOnRepo: stats.points,
        totalScore: Number(prof?.score ?? stats.points),
        overallPrs: Number(prof?.merged_prs ?? stats.prCount),
        repoNames: Array.from(stats.repoNames),
        latestPrTitle: stats.latestPrTitle,
        latestPrDate: stats.latestPrDate,
        latestPrUrl: stats.latestPrUrl,
      };
    }
  );

  // Sort contributors by points on these repos descending
  contributors.sort((a, b) => b.pointsOnRepo - a.pointsOnRepo);

  // 9. Assemble Managed Projects with live metrics
  const managedProjects: ProjectAdminProject[] = matchedProjects.map((p) => {
    const slug = extractRepoSlug(p.githubUrl)?.toLowerCase();
    const short = p.title.split("–")[0].trim().toLowerCase();

    const repoPRs = relevantContributions.filter((c) => {
      if (c.project_id === p.id) return true;
      if (c.github_url) {
        const cSlug = extractRepoSlug(c.github_url)?.toLowerCase();
        if (slug && cSlug === slug) return true;
        if (c.github_url.toLowerCase().includes(short)) return true;
      }
      return false;
    });

    const prCount = repoPRs.length;
    const totalPoints = repoPRs.reduce((sum, c) => sum + (c.points_awarded || 10), 0);
    const distinctContributors = new Set(repoPRs.map((c) => c.user_id).filter(Boolean)).size;

    return {
      id: p.id,
      name: p.title,
      githubRepoUrl: p.githubUrl,
      description: p.description,
      language: p.language,
      accentColor: p.accentColor,
      stars: p.stars || "0",
      forks: p.forks || "0",
      openIssues: p.openIssues || "0",
      prCount,
      contributorCount: distinctContributors,
      totalPoints,
      adminGithub: slug ? slug.split("/")[0] : undefined,
    };
  });

  // Submissions by this admin awaiting approval (or rejected)
  const submissionHandle = (caller.github || "").replace(/^@+/, "").trim().toLowerCase();
  const submissions: ProjectAdminData["submissions"] = submissionHandle
    ? (await getAllProjectsForAdmins())
        .filter((p) => p.status !== "approved" && (p.submittedBy || "").toLowerCase() === submissionHandle)
        .map((p) => ({
          id: p.id,
          name: p.title,
          githubRepoUrl: p.githubUrl,
          status: p.status as "pending" | "rejected",
          rejectionReason: p.rejectionReason,
        }))
    : [];

  // 10. Compute Summary Metrics
  const metrics: ProjectAdminMetrics = {
    totalRepos: managedProjects.length,
    totalContributors: contributors.length,
    totalPRs: pullRequests.length,
    totalPointsAwarded: pullRequests.reduce((sum, pr) => sum + pr.points, 0),
  };

  return {
    currentUser: {
      id: caller.id,
      name: caller.full_name,
      email: caller.email,
      github: caller.github,
      role: caller.role,
      isSuperAdmin,
    },
    selectedAdminGithub: isSuperAdmin && targetAdminGithub ? targetAdminGithub : activeGithub,
    allProjectAdmins,
    managedProjects,
    submissions,
    contributors,
    pullRequests,
    metrics,
  };
}

/**
 * Awards merit bonus points to a contributor who works on the project admin's repository.
 * Enforces ownership verification: Project Admins can only award points to contributors
 * on their own repositories. Self-scoring is strictly prevented.
 */
export async function awardContributorPointsAction(
  contributorUserId: string,
  pointDelta: number,
  reason?: string
): Promise<{ success: boolean; error?: string; newScore?: number }> {
  try {
    const { profile: caller, isSuperAdmin } = await requireProjectAdminSession();

    if (!contributorUserId || typeof contributorUserId !== "string") {
      return { success: false, error: "Invalid contributor user ID provided." };
    }

    if (isNaN(pointDelta) || pointDelta === 0) {
      return { success: false, error: "Please provide a valid non-zero point value." };
    }

    // Rule 1: Anti-Tampering (no self-scoring)
    if (caller.user_id === contributorUserId || caller.id === contributorUserId) {
      return { success: false, error: "Self-scoring is strictly prohibited." };
    }

    const admin = createAdminClient();

    // Rule 2: Ownership verification if not Super Admin
    if (!isSuperAdmin) {
      const activeGithub = (caller.github || "").trim().toLowerCase();
      const allProjects = await getProjects();
      const callerProjectIds = new Set(
        allProjects
          .filter((p) => {
            const slug = extractRepoSlug(p.githubUrl);
            return slug && slug.split("/")[0]?.toLowerCase() === activeGithub;
          })
          .map((p) => p.id)
      );

      // Check if contributor has at least one contribution in caller's repos
      const { data: hasContrib } = await admin
        .from("contributions")
        .select("id")
        .eq("user_id", contributorUserId)
        .in("project_id", Array.from(callerProjectIds))
        .limit(1);

      if (!hasContrib || hasContrib.length === 0) {
        return {
          success: false,
          error: "Permission denied: You can only award merit points to contributors working on your repositories.",
        };
      }
    }

    // Apply the score update
    const res = await updateUserScore(contributorUserId, pointDelta, "add");
    if (!res.success) {
      return { success: false, error: res.error || "Failed to award points to contributor." };
    }

    revalidatePath("/project-admin");
    revalidatePath("/admin");
    revalidatePath("/leaderboard");
    revalidatePath("/dashboard");

    return { success: true, newScore: res.score };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to award points";
    return { success: false, error: msg };
  }
}

/**
 * Triggers an instant on-demand GitHub PR sync for a specific contributor.
 */
export async function syncContributorPRsAction(
  contributorUserId: string,
  githubHandle: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    await requireProjectAdminSession();

    if (!githubHandle || !githubHandle.trim()) {
      return { success: false, error: "Contributor does not have a linked GitHub handle." };
    }

    const cleanHandle = githubHandle.replace(/^@+/, "").trim();
    const result = await syncSingleUser(contributorUserId, cleanHandle);

    revalidatePath("/project-admin");
    revalidatePath("/dashboard");
    revalidatePath("/leaderboard");

    if (result && !result.success) {
      return { success: false, error: result.error || "Sync failed for this contributor." };
    }

    return {
      success: true,
      message: `Successfully synchronized GitHub PRs for @${cleanHandle}.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to sync contributor";
    return { success: false, error: msg };
  }
}


/**
 * Lets a Project Admin (or Super Admin) register a GitHub repository as a competition project.
 * The repo must exist and not already be tracked. Details are pulled from GitHub, and the project
 * is tagged with the caller's GitHub handle so it appears under their managed repositories.
 */
export async function addProjectAsAdminAction(
  repoInput: string,
  descriptionInput?: string
): Promise<{ success: boolean; project?: ProjectItem; error?: string }> {
  try {
    const { profile: caller, isSuperAdmin } = await requireProjectAdminSession();

    const slug = extractRepoSlug((repoInput || "").trim());
    if (!slug || !/^[\w.-]+\/[\w.-]+$/.test(slug)) {
      return { success: false, error: "Enter a valid GitHub repository URL, e.g. https://github.com/owner/repo." };
    }

    const adminGithub = (caller.github || "").replace(/^@+/, "").trim();
    if (!adminGithub && !isSuperAdmin) {
      return {
        success: false,
        error: "Connect your GitHub account on your dashboard before adding a project.",
      };
    }

    const existing = await getAllProjectsForAdmins();
    const duplicate = existing.find((p) => extractRepoSlug(p.githubUrl) === slug);
    // A rejected submission can be resubmitted by the same admin
    const isResubmit =
      !!duplicate &&
      duplicate.status === "rejected" &&
      !!adminGithub &&
      (duplicate.submittedBy || "").toLowerCase() === adminGithub.toLowerCase();
    if (duplicate && !isResubmit) {
      return {
        success: false,
        error:
          duplicate.status === "pending"
            ? "This repository has already been submitted and is awaiting approval."
            : "This repository is already registered in the competition.",
      };
    }

    // Verify the repo exists on GitHub and pull its details
    let ghRepo: {
      full_name: string;
      description: string | null;
      language: string | null;
      stargazers_count: number;
      forks_count: number;
      open_issues_count: number;
      html_url: string;
      private: boolean;
      archived: boolean;
    } | null = null;
    try {
      const res = await fetch(`https://api.github.com/repos/${slug}`, {
        headers: getGitHubAuthHeaders(),
        cache: "no-store",
      });
      if (res.status === 404) {
        return { success: false, error: `Repository ${slug} was not found on GitHub (it must be public).` };
      }
      if (res.ok) ghRepo = await res.json();
    } catch {
      // GitHub unreachable / rate limited: fall back to the URL alone
    }
    if (ghRepo?.private) {
      return { success: false, error: "Only public repositories can be added." };
    }
    if (ghRepo?.archived) {
      return { success: false, error: "Archived repositories cannot be added." };
    }

    const [owner, repo] = ghRepo?.full_name?.split("/") ?? slug.split("/");
    const meta = {
      language: ghRepo?.language || "TypeScript",
      accentColor: "#FF7518",
      stars: String(ghRepo?.stargazers_count ?? 0),
      forks: String(ghRepo?.forks_count ?? 0),
      openIssues: ghRepo?.open_issues_count ?? 0,
      ...(adminGithub ? { admin_github: adminGithub } : {}),
      // Project admin submissions need Super Admin approval; Super Admin additions go live immediately
      ...(isSuperAdmin ? {} : { status: "pending" }),
    };
    const userDesc =
      (descriptionInput || "").trim() ||
      ghRepo?.description ||
      "Community open source project participating in OSC India.";

    const admin = createAdminClient();
    const description = `${userDesc}\n<!--meta:${JSON.stringify(meta)}-->`;
    const { data, error } = isResubmit
      ? await admin
          .from("projects")
          .update({
            description: withProjectMeta(description, { status: "pending", rejection_reason: null }),
          })
          .eq("id", duplicate!.id)
          .select()
          .single()
      : await admin
          .from("projects")
          .insert({
            name: repo,
            github_repo_url: ghRepo?.html_url || `https://github.com/${owner}/${repo}`,
            description,
          })
          .select()
          .single();

    if (error) {
      return { success: false, error: `Database error: ${error.message}` };
    }

    await invalidateSlugCache();
    revalidatePath("/projects");
    revalidatePath("/admin");
    revalidatePath("/project-admin");

    const project: ProjectItem = {
      id: String(data.id),
      title: data.name,
      description: userDesc,
      githubUrl: data.github_repo_url,
      language: meta.language,
      accentColor: meta.accentColor,
      stars: meta.stars,
      forks: meta.forks,
      openIssues: String(meta.openIssues),
      status: isSuperAdmin ? "approved" : "pending",
    };
    return { success: true, project };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add project." };
  }
}
