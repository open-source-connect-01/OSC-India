"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncGitHubContribution, syncAllProjectsAndContributors } from "./github";
import { Profile } from "@/lib/supabase/database";
import { revalidatePath } from "next/cache";

import {
  verifyAdminSession,
  validateAdminCredentials,
  setAdminSessionCookie,
  clearAdminSessionCookie,
} from "@/lib/auth/admin-auth";
import { getProjects, ProjectItem, getDbAllowedRepoSlugs } from "./projects";

/**
 * Validates that the current user has super admin privileges.
 * Supports dedicated admin email/password session or Supabase admin user.
 */
async function requireSuperAdmin() {
  const isAdminSession = await verifyAdminSession();
  if (isAdminSession) {
    return {
      user: { id: "admin-session", email: process.env.ADMIN_PORTAL_EMAIL || "admin@osc-india.org" },
      profile: { id: "admin-session", role: "admin", is_admin: true },
    };
  }

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("Unauthorized. Admin authentication required.");
  }

  const admin = createAdminClient();
  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("id, role, is_admin")
    .eq("id", user.id)
    .single();

  if (profErr || !profile || (!profile.is_admin && profile.role !== "admin")) {
    throw new Error("Forbidden. Super Admin privileges required.");
  }

  return { user, profile };
}

/**
 * Validates that the current user has either Admin or Project Admin privileges.
 */
async function requireAdminOrProjectAdmin() {
  const isAdminSession = await verifyAdminSession();
  if (isAdminSession) {
    return {
      user: { id: "admin-session", email: process.env.ADMIN_PORTAL_EMAIL || "admin@osc-india.org" },
      profile: { id: "admin-session", role: "admin", is_admin: true },
    };
  }

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("Unauthorized. Elevated privileges required.");
  }

  const admin = createAdminClient();
  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("id, role, is_admin")
    .eq("id", user.id)
    .single();

  if (
    profErr ||
    !profile ||
    (!profile.is_admin && profile.role !== "admin" && profile.role !== "project-admin")
  ) {
    throw new Error("Forbidden. Elevated privileges required.");
  }

  return { user, profile };
}

/**
 * Fetches all user profiles and aggregates for the Super Admin Dashboard.
 * Merges public.profiles table with auth.users to ensure email, github,
 * scores, and roles are never missing even if DB schema migration is pending.
 */
export async function getAdminData() {
  await requireSuperAdmin();
  const admin = createAdminClient();

  // 1. Fetch from profiles table (resilient)
  let rawProfiles: Profile[] = [];
  try {
    const { data, error } = await admin.from("profiles").select("*");
    if (!error && data) {
      rawProfiles = data as Profile[];
    }
  } catch (err) {
    console.warn("Notice: reading profiles table in admin portal:", err);
  }

  // 2. Fetch from auth.users
  let authUsers: any[] = [];
  try {
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (!error && data?.users) {
      authUsers = data.users;
    }
  } catch (err) {
    console.warn("Notice: reading auth.users in admin portal:", err);
  }

  // 3. Build unified profiles list with email-first deduplication
  const unifiedProfiles: Profile[] = [];
  const adminEmail = (process.env.ADMIN_PORTAL_EMAIL || "sayanghosh1887@gmail.com").toLowerCase();

  function findUnifiedUser(email?: string | null, github?: string | null, id?: string | null, fullName?: string | null) {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanGithub = (github || "").replace(/^@/, "").trim().toLowerCase();
    const cleanName = (fullName || "").trim().toLowerCase();

    return unifiedProfiles.find((item) => {
      // 1. Search by email (primary key for user identity)
      if (cleanEmail && item.email && item.email.trim().toLowerCase() === cleanEmail) {
        return true;
      }
      // 2. Search by GitHub handle
      if (cleanGithub && item.github && item.github.replace(/^@/, "").trim().toLowerCase() === cleanGithub) {
        return true;
      }
      // 3. Search by ID
      if (id && item.id === id) {
        return true;
      }
      // 4. If names match exactly and either user lacks an email, unify them as the same person
      if (cleanName && item.full_name && item.full_name.trim().toLowerCase() === cleanName) {
        if (!cleanEmail || !item.email || cleanEmail === item.email.trim().toLowerCase()) {
          return true;
        }
      }
      return false;
    });
  }

  function mergeContributor(target: Profile, incoming: Partial<Profile>, isIncomingAuthoritative = false) {
    if (incoming.email && !target.email) target.email = incoming.email;
    if (incoming.github && !target.github) target.github = incoming.github;
    if (incoming.full_name && (!target.full_name || target.full_name === "Contributor")) target.full_name = incoming.full_name;
    if (incoming.avatar_url && !target.avatar_url) target.avatar_url = incoming.avatar_url;
    if (incoming.is_admin || incoming.role === "admin") {
      target.is_admin = true;
      target.role = "admin";
    } else if (incoming.role && incoming.role !== "contributor" && target.role === "contributor") {
      target.role = incoming.role;
    }
    
    // If incoming is from public.profiles, it authoritatively overrides stale auth metadata
    if (isIncomingAuthoritative) {
      target.score = Number(incoming.score ?? target.score ?? 0);
      target.merged_prs = Number(incoming.merged_prs ?? target.merged_prs ?? 0);
      target.projects_count = Number(incoming.projects_count ?? target.projects_count ?? 0);
      target.badges_created = Number(incoming.badges_created ?? target.badges_created ?? 0);
    } else {
      if (target.score === undefined || target.score === null) target.score = Number(incoming.score || 0);
      if (target.merged_prs === undefined || target.merged_prs === null) target.merged_prs = Number(incoming.merged_prs || 0);
      if (target.projects_count === undefined || target.projects_count === null) target.projects_count = Number(incoming.projects_count || 0);
      if (target.badges_created === undefined || target.badges_created === null) target.badges_created = Number(incoming.badges_created || 0);
    }

    if (incoming.tech_stack && incoming.tech_stack.length > 0) {
      target.tech_stack = Array.from(new Set([...(target.tech_stack || []), ...incoming.tech_stack]));
    }
  }

  // A. Ingest database profile records first (AUTHORITATIVE SOURCE OF TRUTH)
  for (const p of rawProfiles) {
    const rawP = p as any;
    const existing = findUnifiedUser(p.email, p.github, p.id || rawP.user_id, p.full_name);
    if (existing) {
      mergeContributor(existing, p, true);
    } else {
      unifiedProfiles.push({
        id: p.id,
        email: p.email || "",
        full_name: p.full_name || "Contributor",
        avatar_url: p.avatar_url || null,
        github: p.github || null,
        role: p.role || "contributor",
        is_admin: Boolean(p.is_admin),
        score: Number(p.score ?? 0),
        merged_prs: Number(p.merged_prs ?? 0),
        projects_count: Number(p.projects_count ?? 0),
        badges_created: Number(p.badges_created ?? 0),
        tech_stack: p.tech_stack || [],
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString(),
      } as Profile);
    }
  }

  // B. Ingest authUsers only as fallback for newly registered accounts lacking a profile row
  for (const u of authUsers) {
    const meta = u.user_metadata || {};
    const email = u.email || meta.email || "";
    const fullName = meta.full_name || meta.name || email.split("@")[0] || "Contributor";
    const avatar = meta.avatar_url || meta.picture || null;
    const github = meta.github || meta.user_name || meta.preferred_username || null;
    const isOwner = email.toLowerCase() === adminEmail;
    const role = meta.role || (isOwner ? "admin" : "contributor");
    const isAdmin = Boolean(meta.is_admin || isOwner || role === "admin");

    const candidate: Profile = {
      id: u.id,
      email: email,
      full_name: fullName,
      avatar_url: avatar,
      github: github,
      role: role,
      is_admin: isAdmin,
      score: Number(meta.score ?? 0),
      merged_prs: Number(meta.merged_prs ?? 0),
      projects_count: Number(meta.projects_count ?? 0),
      badges_created: Number(meta.badges_created ?? 0),
      tech_stack: meta.tech_stack || [],
      created_at: u.created_at || new Date().toISOString(),
      updated_at: u.updated_at || new Date().toISOString(),
    } as Profile;

    const existing = findUnifiedUser(candidate.email, candidate.github, candidate.id, candidate.full_name);
    if (existing) {
      // Supplemental only (never overwrite verified DB metrics with old auth metadata)
      mergeContributor(existing, candidate, false);
    } else {
      unifiedProfiles.push(candidate);
    }
  }

  const profiles = unifiedProfiles;

  // Sort by score desc, then by date
  profiles.sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) {
      return (b.score || 0) - (a.score || 0);
    }
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });

  const metrics = {
    totalUsers: profiles.length,
    contributors: profiles.filter((p) => p.role === "contributor").length,
    mentors: profiles.filter((p) => p.role === "mentor").length,
    projectAdmins: profiles.filter((p) => p.role === "project-admin").length,
    admins: profiles.filter((p) => p.is_admin || p.role === "admin").length,
    totalPRs: profiles.reduce((acc, p) => acc + (p.merged_prs || 0), 0),
    totalScore: profiles.reduce((acc, p) => acc + (p.score || 0), 0),
  };

  const projects = await getProjects();

  return { profiles, metrics, projects };
}

/**
 * Updates a user's role.
 * Rule: If promoted to admin or project-admin, stats are reset to 0.
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: "contributor" | "mentor" | "project-admin" | "admin"
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();
  const admin = createAdminClient();

  const isElevated = newRole === "admin" || newRole === "project-admin";
  const updates: Partial<Profile> = {
    role: newRole,
    is_admin: newRole === "admin",
    updated_at: new Date().toISOString(),
  };

  // Reset scores if promoted out of contributor
  if (isElevated || newRole === "mentor") {
    updates.score = 0;
    updates.merged_prs = 0;
    updates.projects_count = 0;
  }

  // 1. Update auth.users metadata (works unconditionally)
  let userEmail = "";
  try {
    const { data: userData } = await admin.auth.admin.getUserById(targetUserId);
    if (userData?.user) {
      userEmail = userData.user.email || userData.user.user_metadata?.email || "";
      await admin.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          ...userData.user.user_metadata,
          role: newRole,
          is_admin: newRole === "admin",
          ...(isElevated || newRole === "mentor" ? { score: 0, merged_prs: 0, projects_count: 0 } : {}),
        },
      });
    }
  } catch (authErr) {
    console.warn("Notice: auth metadata role update:", authErr);
  }

  // 2. Also try updating profiles table (by id and email)
  try {
    await admin.from("profiles").update(updates).eq("id", targetUserId);
    if (userEmail) {
      await admin.from("profiles").update(updates).ilike("email", userEmail);
    }
  } catch (dbErr) {
    console.warn("Notice: profiles table role update:", dbErr);
  }

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  return { success: true };
}

/**
 * Assigns or modifies a contributor's score.
 * Rules:
 * 1. Anti-Tampering: Requester cannot score themselves.
 * 2. Contributor-Only: Can only score contributors.
 */
export async function updateUserScore(targetUserId: string, pointDelta: number, mode: "add" | "set" = "add") {
  const { profile: requester } = await requireAdminOrProjectAdmin();
  const admin = createAdminClient();

  // Rule 1: Anti-Tampering / No Self-Scoring
  if (requester.id === targetUserId && requester.id !== "admin-session") {
    return { success: false, error: "Self-scoring is strictly prohibited." };
  }

  let currentScore = 0;
  let currentRole = "contributor";

  // Fetch current user from auth.users or profiles
  try {
    const { data: userData } = await admin.auth.admin.getUserById(targetUserId);
    if (userData?.user?.user_metadata) {
      currentScore = Number(userData.user.user_metadata.score ?? 0);
      currentRole = userData.user.user_metadata.role || "contributor";
    }
  } catch {
    // fallback
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, score")
    .eq("id", targetUserId)
    .maybeSingle();

  if (target) {
    if (target.score !== undefined && target.score !== null) currentScore = Number(target.score);
    if (target.role) currentRole = target.role;
  }

  // Rule 2: Only contributors can have scores
  if (currentRole !== "contributor") {
    return { success: false, error: "Only contributors can be awarded merit points." };
  }

  const newScore = mode === "set" ? Math.max(0, pointDelta) : Math.max(0, currentScore + pointDelta);

  // 1. Update in auth user_metadata
  let userEmail = "";
  try {
    const { data: userData } = await admin.auth.admin.getUserById(targetUserId);
    if (userData?.user) {
      userEmail = userData.user.email || userData.user.user_metadata?.email || "";
      await admin.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          ...userData.user.user_metadata,
          score: newScore,
        },
      });
    }
  } catch (authErr) {
    console.warn("Notice: auth metadata score update:", authErr);
  }

  // 2. Also try updating profiles table (by id and email)
  try {
    await admin
      .from("profiles")
      .update({
        score: newScore,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    if (userEmail) {
      await admin
        .from("profiles")
        .update({
          score: newScore,
          updated_at: new Date().toISOString(),
        })
        .ilike("email", userEmail);
    }
  } catch (dbErr) {
    console.warn("Notice: profiles table score update:", dbErr);
  }

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { success: true, score: newScore };
}

/**
 * Updates a user's GitHub username directly from the Admin Portal.
 */
export async function updateUserGithub(
  targetUserId: string,
  newGithub: string
): Promise<{ success: boolean; github?: string; error?: string }> {
  await requireAdminOrProjectAdmin();
  const admin = createAdminClient();
  const cleanGithub = newGithub.replace(/^@/, "").trim();

  // 1. Update in auth user_metadata
  let userEmail = "";
  try {
    const { data: userData } = await admin.auth.admin.getUserById(targetUserId);
    if (userData?.user) {
      userEmail = userData.user.email || userData.user.user_metadata?.email || "";
      await admin.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          ...userData.user.user_metadata,
          github: cleanGithub,
        },
      });
    }
  } catch (authErr) {
    console.warn("Notice: auth metadata github update:", authErr);
  }

  // 2. Also try updating profiles table (by id and email)
  try {
    await admin
      .from("profiles")
      .update({
        github: cleanGithub,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    if (userEmail) {
      await admin
        .from("profiles")
        .update({
          github: cleanGithub,
          updated_at: new Date().toISOString(),
        })
        .ilike("email", userEmail);
    }
  } catch (dbErr) {
    console.warn("Notice: profiles table github update:", dbErr);
  }

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { success: true, github: cleanGithub };
}

/**
 * Synchronizes a single contributor's GitHub PRs
 */
export async function syncSingleUser(targetUserId: string, githubHandle: string) {
  await requireAdminOrProjectAdmin();
  const admin = createAdminClient();
  const allowedSlugs = await getDbAllowedRepoSlugs(admin);
  const res = await syncGitHubContribution(targetUserId, githubHandle, allowedSlugs);
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return res;
}

/**
 * Bulk syncs all contributors using the fast, repo-centric full sync engine.
 * Gathers merged PRs across all official competition projects in seconds,
 * computes difficulty scores, and updates all 608 contributor profiles without rate-limit issues.
 */
export async function syncAllUsers() {
  await requireSuperAdmin();
  const result = await syncAllProjectsAndContributors();

  return {
    success: result.success,
    error: result.error,
    total: result.contributorsProcessed,
    synced: result.updatedProfiles,
    failed: 0,
    trackedRepos: result.trackedRepos,
    activeContributors: result.activeContributorsWithPoints,
    duration: result.duration,
  };
}

/**
 * Authenticates the admin using email and password.
 * Issues an HMAC-signed HTTP-only session cookie.
 */
export async function adminLoginAction(
  prevState: { error?: string } | null,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return { success: false, error: "Please provide both admin email and password." };
    }

    const isValid = validateAdminCredentials(email, password);
    if (!isValid) {
      return { success: false, error: "Invalid admin email or password." };
    }

    await setAdminSessionCookie();
    revalidatePath("/admin");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify admin credentials.";
    return { success: false, error: message };
  }
}

/**
 * Destroys the admin session cookie and locks the admin portal.
 */
export async function adminLogoutAction(): Promise<{ success: boolean }> {
  await clearAdminSessionCookie();
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Permanently deletes a user from public.profiles and auth.users.
 * Strict rules:
 * - Requires Super Admin privileges.
 * - Prevents deleting oneself.
 * - Prevents deleting root super admin accounts (ADMIN_PORTAL_EMAIL or sayanghosh1887@gmail.com).
 * - Purges public.profiles, dependent records, and Supabase auth accounts.
 */
export async function deleteUserAction(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentAdmin = await requireSuperAdmin();
    const admin = createAdminClient();

    if (!targetUserId || typeof targetUserId !== "string") {
      return { success: false, error: "Invalid user ID provided." };
    }

    // 1. Self-deletion check by ID
    if (currentAdmin.user.id === targetUserId) {
      return { success: false, error: "You cannot delete your own admin account." };
    }

    // 2. Fetch target user's profile and auth information
    let targetEmail: string | null = null;

    try {
      const { data: profile } = await admin
        .from("profiles")
        .select("id, email, role, is_admin")
        .eq("id", targetUserId)
        .maybeSingle();

      if (profile?.email) {
        targetEmail = profile.email;
      }
    } catch (e) {
      console.warn("Notice: reading target profile before deletion:", e);
    }

    try {
      const { data: authData } = await admin.auth.admin.getUserById(targetUserId);
      if (authData?.user) {
        if (!targetEmail) {
          targetEmail = authData.user.email || (authData.user.user_metadata?.email as string) || null;
        }
      }
    } catch (e) {
      console.warn("Notice: reading target auth user before deletion:", e);
    }

    // 3. Root Admin Protection Checks
    const rootAdminEmail = (process.env.ADMIN_PORTAL_EMAIL || "sayanghosh1887@gmail.com").toLowerCase().trim();

    if (targetEmail) {
      const cleanTargetEmail = targetEmail.toLowerCase().trim();
      if (cleanTargetEmail === rootAdminEmail) {
        return { success: false, error: "The primary root administrator account cannot be deleted." };
      }

      if (
        currentAdmin.user.email &&
        cleanTargetEmail === currentAdmin.user.email.toLowerCase().trim()
      ) {
        return { success: false, error: "You cannot delete your own account." };
      }
    }

    // 4. Delete user from public.profiles by id and email
    try {
      await admin.from("profiles").delete().eq("id", targetUserId);
    } catch (dbErr) {
      console.warn("Notice: deleting from profiles by id:", dbErr);
    }

    if (targetEmail) {
      try {
        await admin.from("profiles").delete().ilike("email", targetEmail);
      } catch (dbErr) {
        console.warn("Notice: deleting from profiles by email:", dbErr);
      }
    }

    // 5. Delete any linked child tables if present in database (contributions, leaderboard_stats)
    try {
      await admin.from("contributions").delete().eq("user_id", targetUserId);
    } catch (_) {}

    try {
      await admin.from("leaderboard_stats").delete().eq("user_id", targetUserId);
    } catch (_) {}

    // 6. Delete from Supabase auth.users
    try {
      const { error: authErr } = await admin.auth.admin.deleteUser(targetUserId);
      if (authErr) {
        console.warn("Notice: auth.admin.deleteUser warning:", authErr.message);
      }
    } catch (authErr) {
      console.warn("Notice: auth.admin.deleteUser exception:", authErr);
    }

    // 7. If target user had an email, also purge any duplicate auth identities matching that email
    if (targetEmail) {
      try {
        const { data: usersList } = await admin.auth.admin.listUsers();
        if (usersList?.users) {
          const matchingAuthUsers = usersList.users.filter(
            (u) => u.email?.toLowerCase().trim() === targetEmail!.toLowerCase().trim()
          );
          for (const u of matchingAuthUsers) {
            if (u.id !== targetUserId) {
              await admin.auth.admin.deleteUser(u.id);
            }
          }
        }
      } catch (authPurgeErr) {
        console.warn("Notice: purging duplicate auth accounts by email:", authPurgeErr);
      }
    }

    // 8. Revalidate cached routes
    revalidatePath("/admin");
    revalidatePath("/leaderboard");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete user.";
    return { success: false, error: message };
  }
}


