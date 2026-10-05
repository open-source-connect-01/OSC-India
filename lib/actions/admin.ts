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
import { getProjects, getAllProjectsForAdmins, getDbAllowedRepoSlugs, discoverProjectsByTopic, invalidateSlugCache } from "./projects";
import { readProjectMeta, withProjectMeta } from "@/lib/utils/project-meta";
import { isOfficialProjectAdminEmail, isOfficialProjectAdminHandle } from "@/lib/utils/github-helpers";

/**
 * Validates that the current user has super admin privileges.
 * Supports dedicated admin email/password session or Supabase admin user.
 */
async function requireSuperAdmin() {
  const adminEmail = (process.env.ADMIN_PORTAL_EMAIL || "sayanghosh1887@gmail.com").toLowerCase().trim();
  const isAdminSession = await verifyAdminSession();
  if (isAdminSession) {
    return {
      user: { id: "admin-session", email: adminEmail },
      profile: { id: "admin-session", role: "admin", is_admin: true },
    };
  }

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("Unauthorized. Admin authentication required.");
  }

  const isRootAdmin = Boolean(user.email && user.email.toLowerCase().trim() === adminEmail);
  if (isRootAdmin) {
    return {
      user,
      profile: { id: user.id, user_id: user.id, role: "admin", is_admin: true },
    };
  }

  const admin = createAdminClient();
  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("id, user_id, role, is_admin")
    .or(`user_id.eq.${user.id},id.eq.${user.id}`)
    .maybeSingle();

  const isSuper = profile?.role === "admin" || profile?.is_admin === true;
  if (profErr || !profile || !isSuper) {
    throw new Error("Forbidden. Super Admin privileges required.");
  }

  return { user, profile };
}

/**
 * Validates that the current user has either Admin or Project Admin privileges.
 */
async function requireAdminOrProjectAdmin() {
  const adminEmail = (process.env.ADMIN_PORTAL_EMAIL || "sayanghosh1887@gmail.com").toLowerCase().trim();
  const isAdminSession = await verifyAdminSession();
  if (isAdminSession) {
    return {
      user: { id: "admin-session", email: adminEmail },
      profile: { id: "admin-session", role: "admin", is_admin: true },
    };
  }

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("Unauthorized. Elevated privileges required.");
  }

  const isRootAdmin = Boolean(user.email && user.email.toLowerCase().trim() === adminEmail);
  if (isRootAdmin) {
    return {
      user,
      profile: { id: user.id, user_id: user.id, role: "admin", is_admin: true },
    };
  }

  const admin = createAdminClient();
  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("id, user_id, role, is_admin")
    .or(`user_id.eq.${user.id},id.eq.${user.id}`)
    .maybeSingle();

  const userEmail = (user.email || user.user_metadata?.email || "").toLowerCase().trim();
  const userGh = (user.user_metadata?.user_name || user.user_metadata?.preferred_username || user.user_metadata?.github || "").replace(/^@+/, "").toLowerCase().trim();
  const isProjAdmin = isOfficialProjectAdminEmail(userEmail) || isOfficialProjectAdminHandle(userGh);
  const hasAccess = profile?.role === "admin" || profile?.role === "project-admin" || profile?.is_admin === true || isProjAdmin;
  if ((profErr && !isProjAdmin) || (!profile && !isProjAdmin) || !hasAccess) {
    throw new Error("Forbidden. Admin privileges required.");
  }

  return { user, profile };
}

/**
 * Fetches all user profiles and aggregates for the Super Admin Dashboard.
 * Queries public.profiles cleanly and enriches with auth.users data to ensure
 * email, github, scores, and roles are never missing.
 */
export async function getAdminData() {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const adminEmail = (process.env.ADMIN_PORTAL_EMAIL || "sayanghosh1887@gmail.com").toLowerCase().trim();

  let unifiedProfiles: Profile[] = [];

  // 1. Fetch directly from public.profiles table
  const { data: dbRows, error: dbErr } = await admin
    .from("profiles")
    .select("*")
    .order("score", { ascending: false });

  if (dbErr) {
    console.error("Notice: reading profiles table in admin portal:", dbErr.message);
  }

  // 2. Fetch auth.users from Supabase Auth to enrich profiles and catch newly registered users
  interface AuthUserItem {
    id: string;
    email?: string;
    user_metadata?: {
      github?: string;
      email?: string;
      role?: string;
      is_admin?: boolean;
      full_name?: string;
      name?: string;
      avatar_url?: string;
      picture?: string;
      user_name?: string;
      preferred_username?: string;
      score?: number;
      merged_prs?: number;
      projects_count?: number;
      badges_created?: number;
      tech_stack?: string[];
    };
    created_at?: string;
    updated_at?: string;
  }

  let authUsers: AuthUserItem[] = [];
  try {
    const { data: authData, error: authErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (!authErr && authData?.users) {
      authUsers = authData.users as unknown as AuthUserItem[];
    } else if (authErr) {
      console.warn("Notice: reading auth.users in admin portal:", authErr.message);
    }
  } catch (err) {
    console.warn("Notice: reading auth.users in admin portal:", err);
  }

  const authUsersById = new Map<string, AuthUserItem>();
  const authUsersByEmail = new Map<string, AuthUserItem>();
  const authUsersByGithub = new Map<string, AuthUserItem>();

  for (const u of authUsers) {
    if (u.id) authUsersById.set(u.id, u);
    const uEmail = (u.email || u.user_metadata?.email || "").toLowerCase().trim();
    if (uEmail) authUsersByEmail.set(uEmail, u);
    const uGh = (u.user_metadata?.user_name || u.user_metadata?.preferred_username || u.user_metadata?.github || "").replace(/^@+/, "").toLowerCase().trim();
    if (uGh) authUsersByGithub.set(uGh, u);
  }

  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  const seenGithubs = new Set<string>();

  // Ingest records from public.profiles
  if (dbRows && dbRows.length > 0) {
    for (const p of dbRows as Record<string, unknown>[]) {
      const pId = String(p.user_id || p.id);
      let email = ((p.email as string) || "").toLowerCase().trim();
      let github = ((p.github as string) || "").replace(/^@+/, "").toLowerCase().trim();
      let fullName = ((p.full_name as string) || "").trim();
      let avatarUrl = (p.avatar_url as string) || null;

      // Enrich from auth.users if missing
      const matchingAuth =
        (p.user_id ? authUsersById.get(String(p.user_id)) : null) ||
        (p.id ? authUsersById.get(String(p.id)) : null) ||
        (email ? authUsersByEmail.get(email) : null) ||
        (github ? authUsersByGithub.get(github) : null);

      if (matchingAuth) {
        if (!email && matchingAuth.email) email = matchingAuth.email.toLowerCase().trim();
        const meta = matchingAuth.user_metadata || {};
        if (!fullName || fullName === "Contributor") {
          fullName = meta.full_name || meta.name || (email ? email.split("@")[0] : "Contributor");
        }
        if (!avatarUrl) {
          avatarUrl = meta.avatar_url || meta.picture || null;
        }
        if (!github) {
          github = (meta.user_name || meta.preferred_username || meta.github || "").replace(/^@+/, "").toLowerCase().trim();
        }
      }

      const isOwner = email === adminEmail;
      const isProjAdmin = isOfficialProjectAdminEmail(email) || isOfficialProjectAdminHandle(github);
      const role = isOwner
        ? "admin"
        : isProjAdmin
        ? "project-admin"
        : (((p.role as string) || "contributor") as "contributor" | "mentor" | "project-admin" | "admin");
      const isAdmin = Boolean(isOwner || role === "admin" || p.is_admin);

      seenIds.add(String(p.id));
      if (p.user_id) seenIds.add(String(p.user_id));
      if (email) seenEmails.add(email);
      if (github) seenGithubs.add(github);

      unifiedProfiles.push({
        id: pId,
        user_id: p.user_id ? String(p.user_id) : pId,
        email: email || null,
        full_name: fullName || (email ? email.split("@")[0] : "Contributor"),
        avatar_url: avatarUrl || (github ? `https://avatars.githubusercontent.com/${github}` : null),
        github: github || null,
        linkedin: (p.linkedin as string) || null,
        phone: (p.phone as string) || null,
        country: (p.country as string) || null,
        country_code: (p.country_code as string) || "+91",
        nexfellow_id: (p.nexfellow_id as string) || null,
        role,
        is_admin: isAdmin,
        score: Number(p.score ?? 0),
        merged_prs: Number(p.merged_prs ?? 0),
        projects_count: Number(p.projects_count ?? 0),
        badges_created: Number(p.badges_created ?? 0),
        tech_stack: Array.isArray(p.tech_stack) ? p.tech_stack : [],
        created_at: (p.created_at as string) || new Date().toISOString(),
        updated_at: (p.updated_at as string) || new Date().toISOString(),
      });
    }
  }

  // Also include any auth.users who signed in but didn't have a profile in public.profiles yet!
  for (const u of authUsers) {
    const uEmail = (u.email || u.user_metadata?.email || "").toLowerCase().trim();
    const uGh = (u.user_metadata?.user_name || u.user_metadata?.preferred_username || u.user_metadata?.github || "").replace(/^@+/, "").toLowerCase().trim();

    if (seenIds.has(u.id) || (uEmail && seenEmails.has(uEmail)) || (uGh && seenGithubs.has(uGh))) {
      continue;
    }

    const meta = u.user_metadata || {};
    const isOwner = uEmail === adminEmail;
    const isProjAdmin = isOfficialProjectAdminEmail(uEmail) || isOfficialProjectAdminHandle(uGh);
    const role = isOwner
      ? "admin"
      : isProjAdmin
      ? "project-admin"
      : (((meta.role as string) || "contributor") as "contributor" | "mentor" | "project-admin" | "admin");
    const isAdmin = Boolean(isOwner || role === "admin" || meta.is_admin);
    const fullName = meta.full_name || meta.name || (uEmail ? uEmail.split("@")[0] : "Contributor");
    const avatarUrl = meta.avatar_url || meta.picture || (uGh ? `https://avatars.githubusercontent.com/${uGh}` : null);

    const newProf: Profile = {
      id: u.id,
      user_id: u.id,
      email: uEmail || null,
      full_name: fullName,
      avatar_url: avatarUrl,
      github: uGh || null,
      linkedin: null,
      phone: null,
      country: null,
      country_code: "+91",
      nexfellow_id: null,
      role,
      is_admin: isAdmin,
      score: Number(meta.score ?? 0),
      merged_prs: Number(meta.merged_prs ?? 0),
      projects_count: Number(meta.projects_count ?? 0),
      badges_created: Number(meta.badges_created ?? 0),
      tech_stack: meta.tech_stack || [],
      created_at: u.created_at || new Date().toISOString(),
      updated_at: u.updated_at || new Date().toISOString(),
    };

    seenIds.add(u.id);
    if (uEmail) seenEmails.add(uEmail);
    if (uGh) seenGithubs.add(uGh);
    unifiedProfiles.push(newProf);

    // Auto-create in public.profiles so it persists permanently in the database
    void admin.from("profiles").upsert(newProf, { onConflict: "id" }).then(({ error }) => {
      if (error) console.warn("Notice: auto-provisioning auth user in profiles:", error.message);
    });
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
  const pendingProjects = (await getAllProjectsForAdmins()).filter((p) => p.status === "pending");

  return { profiles, metrics, projects, pendingProjects };
}

/**
 * Approves or rejects a project submitted by a Project Admin.
 * Approved projects go live (public /projects list + PR scoring); rejected ones stay hidden and
 * the submitting admin sees the reason in their portal.
 */
export async function reviewProjectSubmissionAction(
  projectId: string,
  decision: "approve" | "reject",
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();
    const admin = createAdminClient();

    const { data: row, error: readErr } = await admin
      .from("projects")
      .select("id, description")
      .eq("id", projectId)
      .maybeSingle();
    if (readErr || !row) {
      return { success: false, error: readErr?.message || "Project not found." };
    }
    if (readProjectMeta(row.description).status !== "pending") {
      return { success: false, error: "This submission has already been reviewed." };
    }

    const description = withProjectMeta(
      row.description || "",
      decision === "approve"
        ? { status: null, rejection_reason: null }
        : { status: "rejected", rejection_reason: (reason || "").trim().slice(0, 300) || null }
    );
    const { error: updateErr } = await admin.from("projects").update({ description }).eq("id", projectId);
    if (updateErr) {
      return { success: false, error: `Failed to save decision: ${updateErr.message}` };
    }

    await invalidateSlugCache();
    revalidatePath("/projects");
    revalidatePath("/admin");
    revalidatePath("/project-admin");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to review submission." };
  }
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
  // Only write columns that exist on the live profiles table (no updated_at / is_admin).
  const profileUpdates: { role: string; score?: number; merged_prs?: number; projects_count?: number } = {
    role: newRole,
  };

  // Reset scores if promoted out of contributor
  if (isElevated || newRole === "mentor") {
    profileUpdates.score = 0;
    profileUpdates.merged_prs = 0;
    profileUpdates.projects_count = 0;
  }

  // 1. Update profiles table (source of truth for the admin portal) and verify it persisted
  const { data: updatedRows, error: dbErr } = await admin
    .from("profiles")
    .update(profileUpdates)
    .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`)
    .select("id");

  if (dbErr) {
    console.error("Role update failed on profiles table:", dbErr.message);
    return { success: false, error: `Failed to save role: ${dbErr.message}` };
  }
  if (!updatedRows || updatedRows.length === 0) {
    return { success: false, error: "Failed to save role: user profile not found." };
  }

  // 2. Mirror to auth.users metadata (best effort; used by fallbacks)
  try {
    const { data: userData } = await admin.auth.admin.getUserById(targetUserId);
    if (userData?.user) {
      const { error: authErr } = await admin.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          ...userData.user.user_metadata,
          role: newRole,
          is_admin: newRole === "admin",
          ...(isElevated || newRole === "mentor" ? { score: 0, merged_prs: 0, projects_count: 0 } : {}),
        },
      });
      if (authErr) console.warn("Notice: auth metadata role update:", authErr.message);
    }
  } catch (authErr) {
    console.warn("Notice: auth metadata role update:", authErr);
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
    .select("user_id, id, role, score")
    .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`)
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
  try {
    const { data: userData } = await admin.auth.admin.getUserById(targetUserId);
    if (userData?.user) {
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

  // 2. Update profiles table (by user_id or id)
  try {
    await admin
      .from("profiles")
      .update({
        score: newScore,
      })
      .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`);
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
  try {
    const { data: userData } = await admin.auth.admin.getUserById(targetUserId);
    if (userData?.user) {
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

  // 2. Update profiles table (by user_id or id)
  try {
    await admin
      .from("profiles")
      .update({
        github: cleanGithub,
      })
      .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`);
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
  const allowedSlugs = await getDbAllowedRepoSlugs();
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
        .select("id, user_id, role, email")
        .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`)
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

    // 4. Delete user from public.profiles and public.users
    try {
      await admin.from("profiles").delete().or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`);
      await admin.from("users").delete().eq("id", targetUserId);
    } catch (dbErr) {
      console.warn("Notice: deleting from profiles/users by user_id:", dbErr);
    }

    // 5. Delete any linked child tables if present in database (contributions, leaderboard_stats)
    try {
      await admin.from("contributions").delete().eq("user_id", targetUserId);
    } catch {}

    try {
      await admin.from("leaderboard_stats").delete().eq("user_id", targetUserId);
    } catch {}

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

/**
 * Triggers GitHub topic discovery from the Admin Portal.
 * Automatically searches for repositories tagged with 'osci-2026' (or custom topic)
 * and ingests them into the public.projects directory and database.
 */
export async function triggerRepoDiscoveryAction(topic = "osci-2026") {
  await requireAdminOrProjectAdmin();
  try {
    const result = await discoverProjectsByTopic(topic, true);
    revalidatePath("/projects");
    revalidatePath("/admin");
    return {
      success: result.success,
      topic: result.topic,
      totalFound: result.totalFound,
      addedCount: result.addedCount,
      updatedCount: result.updatedCount,
      projects: result.projects,
      error: result.error,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Repository topic discovery failed";
    console.error("Admin repo discovery error:", err);
    return { success: false, error: msg };
  }
}


