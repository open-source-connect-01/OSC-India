"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { OFFICIAL_PROJECT_ADMIN_HANDLES } from "@/lib/utils/github-helpers";

export interface AdminContribution {
  id: string;
  contributorName: string;
  contributorGithub: string;
  contributorAvatar: string;
  prUrl: string;
  pointsAwarded: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  mergedAt: string;
}

export interface ContributorPointSummary {
  contributorName: string;
  contributorGithub: string;
  contributorAvatar: string;
  prCount: number;
  totalPoints: number;
}

export interface DifficultyBreakdown {
  easy: { count: number; points: number };
  medium: { count: number; points: number };
  hard: { count: number; points: number };
  expert: { count: number; points: number };
}

export interface ProjectAdminData {
  project: { id: string; name: string; url: string; description?: string };
  totalPRsMerged: number;
  prsMergedByAdmin: number;
  totalContributors: number;
  totalPointsAwarded: number;
  contributions: AdminContribution[];
  difficultyBreakdown: DifficultyBreakdown;
  contributorSummary: ContributorPointSummary[];
}

function getDifficultyLabel(points: number): "Easy" | "Medium" | "Hard" | "Expert" {
  if (points >= 50) return "Expert";
  if (points >= 30) return "Hard";
  if (points >= 20) return "Medium";
  return "Easy";
}

/**
 * Purges and resets any points/score acquired by Project Admins.
 * Project Admins are organizers and earn 0 points for everything.
 */
export async function purgeProjectAdminScores(): Promise<{ success: boolean; purgedCount: number }> {
  try {
    const admin = createAdminClient();

    // 1. Fetch all profiles that have role = 'project-admin' or match official handles
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, user_id, github, role, score");

    if (!profiles || profiles.length === 0) {
      return { success: true, purgedCount: 0 };
    }

    const adminProfiles = profiles.filter((p) => {
      if (p.role === "project-admin") return true;
      const gh = (p.github || "").replace(/^@+/, "").trim().toLowerCase();
      return gh && OFFICIAL_PROJECT_ADMIN_HANDLES.has(gh);
    });

    let purgedCount = 0;
    const adminUserIds: string[] = [];

    for (const p of adminProfiles) {
      const uid = p.user_id || p.id;
      if (uid) adminUserIds.push(uid);

      if (p.score && p.score > 0) {
        await admin
          .from("profiles")
          .update({ score: 0 })
          .eq("id", p.id);
        purgedCount++;
      }
    }

    if (adminUserIds.length > 0) {
      // 2. Reset leaderboard_stats to 0 points
      await admin
        .from("leaderboard_stats")
        .update({ total_points: 0, current_streak: 0 })
        .in("user_id", adminUserIds);

      // 3. Ensure any contribution rows authored by or attributed to project admins award 0 points
      await admin
        .from("contributions")
        .update({ points_awarded: 0 })
        .in("user_id", adminUserIds);
    }

    return { success: true, purgedCount };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Score purge error";
    console.warn("purgeProjectAdminScores warning:", msg);
    return { success: false, purgedCount: 0 };
  }
}

/**
 * Fetches all data needed for the Project Admin dashboard section.
 * Finds the project owned by this admin, calculates:
 * - Contributor PRs on their project
 * - How many PRs were merged by him/her
 * - Dedicated Points Given section to the contributors (breakdown and summary)
 */
export async function getProjectAdminData(
  githubHandle: string,
  userId?: string
): Promise<ProjectAdminData | null> {
  if (!githubHandle && !userId) return null;

  const admin = createAdminClient();
  const handleLower = (githubHandle || "").replace(/^@+/, "").trim().toLowerCase();

  // 1. Find the project owned by this admin
  const { data: projects } = await admin
    .from("projects")
    .select("id, name, github_repo_url, description");

  let ownedProject = (projects || []).find((p) => {
    if (!p.github_repo_url) return false;
    const url = p.github_repo_url.toLowerCase();
    return (
      url.includes(`/${handleLower}/`) ||
      url.endsWith(`/${handleLower}`) ||
      (handleLower === "jugaadlang" && url.includes("jugaadlang")) ||
      (handleLower === "sandesh13fr" && url.includes("tcalc"))
    );
  });

  if (!ownedProject) {
    try {
      const customProjects = require("@/data/custom-projects.json");
      const matched = customProjects.find((cp: { githubUrl?: string; title: string; id: string; description?: string }) => {
        const u = (cp.githubUrl || "").toLowerCase();
        return (
          u.includes(`/${handleLower}/`) ||
          u.endsWith(`/${handleLower}`) ||
          (handleLower === "jugaadlang" && u.includes("jugaadlang")) ||
          (handleLower === "sandesh13fr" && u.includes("tcalc"))
        );
      });
      if (matched) {
        ownedProject = {
          id: matched.id,
          name: matched.title,
          github_repo_url: matched.githubUrl,
          description: matched.description,
        };
      }
    } catch {}
  }

  if (!ownedProject) return null;

  // 2. Fetch contributor PRs on this project (type="pr" only, status="merged")
  const { data: contribRows } = await admin
    .from("contributions")
    .select("id, user_id, github_url, points_awarded, contributed_at")
    .eq("project_id", ownedProject.id)
    .eq("type", "pr")
    .eq("status", "merged")
    .order("contributed_at", { ascending: false });

  // 3. Check PRs explicitly recorded as merged by this admin (type="pr_merge")
  let prsMergedByAdminCount = 0;
  if (userId || handleLower) {
    const { data: mergeRows } = await admin
      .from("contributions")
      .select("id")
      .eq("project_id", ownedProject.id)
      .eq("type", "pr_merge");

    prsMergedByAdminCount = mergeRows?.length || 0;
  }

  // If no explicit pr_merge rows exist yet, maintainer count defaults to total project merged PRs
  if (prsMergedByAdminCount === 0 && contribRows && contribRows.length > 0) {
    prsMergedByAdminCount = contribRows.length;
  }

  const emptyBreakdown: DifficultyBreakdown = {
    easy: { count: 0, points: 0 },
    medium: { count: 0, points: 0 },
    hard: { count: 0, points: 0 },
    expert: { count: 0, points: 0 },
  };

  if (!contribRows || contribRows.length === 0) {
    return {
      project: {
        id: ownedProject.id,
        name: ownedProject.name,
        url: ownedProject.github_repo_url,
        description: (ownedProject.description || "").replace(/<!--[\s\S]*?-->/g, "").trim(),
      },
      totalPRsMerged: 0,
      prsMergedByAdmin: prsMergedByAdminCount,
      totalContributors: 0,
      totalPointsAwarded: 0,
      contributions: [],
      difficultyBreakdown: emptyBreakdown,
      contributorSummary: [],
    };
  }

  // 4. Batch-fetch contributor profiles
  const uniqueUserIds = [...new Set(contribRows.map((c) => c.user_id).filter(Boolean))];
  const { data: profileRows } = await admin
    .from("profiles")
    .select("user_id, id, full_name, github, avatar_url")
    .or(`user_id.in.(${uniqueUserIds.join(",")}),id.in.(${uniqueUserIds.join(",")})`);

  const profileByUserId = new Map<
    string,
    { full_name: string | null; github: string | null; avatar_url: string | null }
  >();
  for (const p of profileRows || []) {
    if (p.user_id) profileByUserId.set(p.user_id, p);
    if (p.id) profileByUserId.set(p.id, p);
  }

  // 5. Build contribution rows and breakdown metrics
  const difficultyBreakdown: DifficultyBreakdown = {
    easy: { count: 0, points: 0 },
    medium: { count: 0, points: 0 },
    hard: { count: 0, points: 0 },
    expert: { count: 0, points: 0 },
  };

  const contributorMap = new Map<
    string,
    { name: string; github: string; avatar: string; prCount: number; points: number }
  >();

  const contributions: AdminContribution[] = contribRows.map((c) => {
    const prof = profileByUserId.get(c.user_id) ?? null;
    const pts = Number(c.points_awarded ?? 10);
    const cleanUrl = (c.github_url || "").replace(/^merged:/, "");
    const ghHandle = prof?.github || "";
    const name = prof?.full_name || ghHandle || "Contributor";
    const avatar = prof?.avatar_url || (ghHandle ? `https://avatars.githubusercontent.com/${ghHandle}` : "");
    const diff = getDifficultyLabel(pts);

    // Difficulty metrics
    if (diff === "Expert") {
      difficultyBreakdown.expert.count += 1;
      difficultyBreakdown.expert.points += pts;
    } else if (diff === "Hard") {
      difficultyBreakdown.hard.count += 1;
      difficultyBreakdown.hard.points += pts;
    } else if (diff === "Medium") {
      difficultyBreakdown.medium.count += 1;
      difficultyBreakdown.medium.points += pts;
    } else {
      difficultyBreakdown.easy.count += 1;
      difficultyBreakdown.easy.points += pts;
    }

    // Contributor aggregation
    const userKey = c.user_id || ghHandle || name;
    if (!contributorMap.has(userKey)) {
      contributorMap.set(userKey, {
        name,
        github: ghHandle,
        avatar,
        prCount: 0,
        points: 0,
      });
    }
    const cont = contributorMap.get(userKey)!;
    cont.prCount += 1;
    cont.points += pts;

    return {
      id: c.id,
      contributorName: name,
      contributorGithub: ghHandle,
      contributorAvatar: avatar,
      prUrl: cleanUrl,
      pointsAwarded: pts,
      difficulty: diff,
      mergedAt: c.contributed_at || "",
    };
  });

  const contributorSummary: ContributorPointSummary[] = Array.from(contributorMap.values())
    .map((c) => ({
      contributorName: c.name,
      contributorGithub: c.github,
      contributorAvatar: c.avatar,
      prCount: c.prCount,
      totalPoints: c.points,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const totalPointsAwarded = contribRows.reduce((sum, c) => sum + (c.points_awarded ?? 10), 0);

  return {
    project: {
      id: ownedProject.id,
      name: ownedProject.name,
      url: ownedProject.github_repo_url,
      description: (ownedProject.description || "").replace(/<!--[\s\S]*?-->/g, "").trim(),
    },
    totalPRsMerged: contribRows.length,
    prsMergedByAdmin: prsMergedByAdminCount,
    totalContributors: contributorMap.size,
    totalPointsAwarded,
    contributions,
    difficultyBreakdown,
    contributorSummary,
  };
}

/**
 * Interactive Server Action: Allows a Project Admin to Give or Override points
 * for a contributor's PR on their managed repository.
 * Security: Verifies the admin owns the project this contribution belongs to.
 * Recalculates and updates the contributor's score in profiles and leaderboard_stats.
 */
export async function updateContributionPoints(
  contributionId: string,
  newPoints: number,
  adminGithubHandle: string
): Promise<{
  success: boolean;
  error?: string;
  updatedPoints?: number;
  newDifficulty?: "Easy" | "Medium" | "Hard" | "Expert";
}> {
  try {
    if (!contributionId || typeof newPoints !== "number" || isNaN(newPoints) || newPoints < 0) {
      return { success: false, error: "Invalid points value. Points must be 0 or greater." };
    }

    const admin = createAdminClient();
    const handleLower = (adminGithubHandle || "").replace(/^@+/, "").trim().toLowerCase();
    const newDifficulty = getDifficultyLabel(newPoints);

    // 1. Fetch contribution row
    const { data: contrib, error: cErr } = await admin
      .from("contributions")
      .select("id, user_id, project_id, points_awarded, projects(id, name, github_repo_url)")
      .eq("id", contributionId)
      .maybeSingle();

    // If not found in DB, return error
    if (cErr || !contrib) {
      return {
        success: false,
        error: "Contribution not found in database.",
      };
    }

    // 2. Authorization check: verify caller is the maintainer of this project or site admin
    const projectUrl = (
      Array.isArray(contrib.projects)
        ? contrib.projects[0]?.github_repo_url
        : (contrib.projects as { github_repo_url?: string } | null)?.github_repo_url
    ) || "";

    const pUrlLower = projectUrl.toLowerCase();
    const isOwner =
      pUrlLower.includes(`/${handleLower}/`) ||
      pUrlLower.endsWith(`/${handleLower}`) ||
      (handleLower === "jugaadlang" && pUrlLower.includes("jugaadlang")) ||
      (handleLower === "sandesh13fr" && pUrlLower.includes("tcalc"));

    // Check if caller is site admin
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .ilike("github", handleLower)
      .maybeSingle();

    const isSiteAdmin = callerProfile?.role === "admin";

    if (!isOwner && !isSiteAdmin) {
      return { success: false, error: "Unauthorized: You can only award points on your own repository." };
    }

    // 3. Ensure target is not a project admin or site admin (admins earn 0 pts)
    if (contrib.user_id) {
      const { data: targetProfile } = await admin
        .from("profiles")
        .select("role, github")
        .or(`user_id.eq.${contrib.user_id},id.eq.${contrib.user_id}`)
        .maybeSingle();

      const targetRole = targetProfile?.role;
      const targetGh = (targetProfile?.github || "").toLowerCase().trim();
      if (targetRole === "project-admin" || targetRole === "admin" || OFFICIAL_PROJECT_ADMIN_HANDLES.has(targetGh)) {
        return { success: false, error: "Project Admins and Site Admins cannot be awarded competition points." };
      }
    }

    // 4. Update points_awarded on the contribution row
    const { error: updateErr } = await admin
      .from("contributions")
      .update({ points_awarded: newPoints })
      .eq("id", contributionId);

    if (updateErr) {
      return { success: false, error: `Database update failed: ${updateErr.message}` };
    }

    // 5. Recalculate contributor's total score across all verified contributions
    if (contrib.user_id) {
      const { data: allUserContribs } = await admin
        .from("contributions")
        .select("points_awarded")
        .eq("user_id", contrib.user_id)
        .eq("type", "pr")
        .eq("status", "merged");

      const newTotalScore = (allUserContribs || []).reduce(
        (sum, c) => sum + Number(c.points_awarded || 0),
        0
      );

      // Update profiles
      await admin
        .from("profiles")
        .update({ score: newTotalScore })
        .or(`user_id.eq.${contrib.user_id},id.eq.${contrib.user_id}`);

      // Update leaderboard_stats
      await admin
        .from("leaderboard_stats")
        .update({ total_points: newTotalScore })
        .eq("user_id", contrib.user_id);
    }

    // 6. Revalidate cache
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/projectadmin");
      revalidatePath("/dashboard");
      revalidatePath("/leaderboard");
    } catch {}

    return {
      success: true,
      updatedPoints: newPoints,
      newDifficulty,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update points";
    return { success: false, error: msg };
  }
}
