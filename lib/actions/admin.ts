"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncGitHubContribution } from "./github";
import { Profile } from "@/lib/supabase/database";
import { revalidatePath } from "next/cache";

import {
  verifyAdminSession,
  validateAdminCredentials,
  setAdminSessionCookie,
  clearAdminSessionCookie,
} from "@/lib/auth/admin-auth";

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
 * Fetches all user profiles and aggregates for the Super Admin Dashboard
 */
export async function getAdminData() {
  await requireSuperAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select("*");

  if (error) {
    throw new Error(`Failed to fetch admin data: ${error.message}`);
  }

  const profiles = (data as Profile[]) || [];

  // Sort safely in-memory (resilient against missing created_at/updated_at columns)
  profiles.sort((a, b) => {
    const timeA = a.created_at || a.updated_at ? new Date(a.created_at || a.updated_at || "").getTime() : 0;
    const timeB = b.created_at || b.updated_at ? new Date(b.created_at || b.updated_at || "").getTime() : 0;
    if (timeA && timeB) return timeB - timeA;
    return (b.score || 0) - (a.score || 0);
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

  return { profiles, metrics };
}

/**
 * Updates a user's role.
 * Rule: If promoted to admin or project-admin, stats are reset to 0.
 */
export async function updateUserRole(targetUserId: string, newRole: "contributor" | "mentor" | "project-admin" | "admin") {
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

  const { error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", targetUserId);

  if (error) {
    return { success: false, error: error.message };
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
  if (requester.id === targetUserId) {
    return { success: false, error: "Self-scoring is strictly prohibited." };
  }

  // Fetch target profile
  const { data: target, error: fetchErr } = await admin
    .from("profiles")
    .select("id, role, score")
    .eq("id", targetUserId)
    .single();

  if (fetchErr || !target) {
    return { success: false, error: "Target user not found." };
  }

  // Rule 2: Only contributors can have scores
  if (target.role !== "contributor") {
    return { success: false, error: "Only contributors can be awarded merit points." };
  }

  const newScore = mode === "set" ? Math.max(0, pointDelta) : Math.max(0, (target.score || 0) + pointDelta);

  const { error: updateErr } = await admin
    .from("profiles")
    .update({
      score: newScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetUserId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { success: true, score: newScore };
}

/**
 * Synchronizes a single contributor's GitHub PRs
 */
export async function syncSingleUser(targetUserId: string, githubHandle: string) {
  await requireAdminOrProjectAdmin();
  const res = await syncGitHubContribution(targetUserId, githubHandle);
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  return res;
}

/**
 * Bulk syncs all contributors with a 2-second rate-limiting delay between requests.
 */
export async function syncAllUsers() {
  await requireSuperAdmin();
  const admin = createAdminClient();

  const { data: contributors, error } = await admin
    .from("profiles")
    .select("id, github")
    .eq("role", "contributor")
    .not("github", "is", null);

  if (error || !contributors) {
    return { success: false, error: error?.message || "Failed to fetch contributors." };
  }

  let successCount = 0;
  let failedCount = 0;

  for (const contributor of contributors) {
    if (!contributor.github) continue;

    try {
      const res = await syncGitHubContribution(contributor.id, contributor.github);
      if (res.success) {
        successCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }

    // 2-second delay between users to avoid GitHub Search API rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  revalidatePath("/admin");
  revalidatePath("/leaderboard");

  return {
    success: true,
    total: contributors.length,
    synced: successCount,
    failed: failedCount,
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

