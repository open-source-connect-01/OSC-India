import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";
import { syncGitHubContribution } from "@/lib/actions/github";

/**
 * Synchronizes and provisions user profile in public.users and public.profiles.
 * Handles deduplication across GitHub and Google logins by matching emails,
 * ensuring that existing GitHub links are preserved when signing in via Google.
 */
export async function syncUserProfile(user: User) {
  const admin = createAdminClient();
  const userEmail = (user.email || user.user_metadata?.email || "").trim().toLowerCase();
  const incomingGithub =
    user.user_metadata?.user_name ||
    user.user_metadata?.preferred_username ||
    user.user_metadata?.github ||
    null;
  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (user.user_metadata?.given_name
      ? `${user.user_metadata.given_name} ${user.user_metadata?.family_name || ""}`.trim()
      : null) ||
    userEmail?.split("@")[0] ||
    "Contributor";
  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  // 1. Always ensure public.users record exists
  try {
    await admin.from("users").upsert(
      {
        id: user.id,
        name: fullName,
        email: userEmail || null,
        image: avatarUrl,
        created_at: user.created_at || new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch (uErr: any) {
    console.warn("Notice: public.users provisioning warning:", uErr?.message);
  }

  // 2. Search existing profile by user_id first
  let existingProfile: any = null;
  const { data: byUserId } = await admin
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (byUserId) {
    existingProfile = byUserId;
  }

  // 3. Fallback: search by GitHub handle if user_id not found
  if (!existingProfile && incomingGithub) {
    const cleanGh = incomingGithub.replace(/^@+/, "").trim().toLowerCase();
    const { data: byGithub } = await admin
      .from("profiles")
      .select("*")
      .ilike("github", cleanGh)
      .maybeSingle();
    if (byGithub) existingProfile = byGithub;
  }

  const mergedGithub = incomingGithub ? incomingGithub.replace(/^@+/, "").trim().toLowerCase() : existingProfile?.github || null;
  const mergedAvatar = avatarUrl || existingProfile?.avatar_url || null;
  const mergedFullName = existingProfile?.full_name || fullName;

  const profileRow: Record<string, any> = {
    user_id: user.id,
    full_name: mergedFullName,
    avatar_url: mergedAvatar,
    github: mergedGithub,
    role: existingProfile?.role || "contributor",
    score: existingProfile?.score ?? 0,
    merged_prs: existingProfile?.merged_prs ?? 0,
    projects_count: existingProfile?.projects_count ?? 0,
    badges_created: existingProfile?.badges_created ?? 0,
  };

  try {
    await admin.from("profiles").upsert(profileRow, { onConflict: "user_id" });
  } catch (pErr: any) {
    console.warn("Notice: public.profiles upsert warning:", pErr?.message);
  }

  // Also synchronize auth metadata so auth.users reflects the unified profile
  try {
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        github: mergedGithub,
        full_name: mergedFullName,
        avatar_url: mergedAvatar,
      },
    });
  } catch {
    // Non-blocking
  }

  // Automatically sync GitHub contributions on login if user has a linked GitHub handle
  if (mergedGithub) {
    try {
      await syncGitHubContribution(user.id, mergedGithub);
    } catch (syncErr: any) {
      console.warn("Notice: automatic contribution sync in syncUserProfile:", syncErr?.message);
    }
  }

  return { ...existingProfile, ...profileRow, email: userEmail };
}
