import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

/**
 * Synchronizes and provisions user profile in public.profiles.
 * Handles deduplication across GitHub and Google logins by matching emails,
 * ensuring that existing GitHub links are preserved when signing in via Google.
 */
export async function syncUserProfile(user: User) {
  const admin = createAdminClient();
  const userEmail = (user.email || user.user_metadata?.email || "").trim().toLowerCase();
  const incomingGithub =
    user.user_metadata?.user_name ||
    user.user_metadata?.preferred_username ||
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

  // 1. Search existing profile by email first (case-insensitive)
  let existingProfile: any = null;
  if (userEmail) {
    const { data: byEmail } = await admin
      .from("profiles")
      .select("*")
      .ilike("email", userEmail)
      .maybeSingle();
    if (byEmail) existingProfile = byEmail;
  }

  // 2. If not found by email, search by GitHub handle
  if (!existingProfile && incomingGithub) {
    const { data: byGithub } = await admin
      .from("profiles")
      .select("*")
      .ilike("github", incomingGithub)
      .maybeSingle();
    if (byGithub) existingProfile = byGithub;
  }

  // 3. If still not found, search by user.id
  if (!existingProfile) {
    const { data: byId } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (byId) existingProfile = byId;
  }

  if (existingProfile) {
    // CRITICAL: Preserve existing GitHub handle!
    // If incoming is Google (incomingGithub is null), DO NOT disconnect the existing handle!
    const mergedGithub = incomingGithub || existingProfile.github || null;
    const mergedEmail = userEmail || existingProfile.email || null;
    const mergedAvatar = avatarUrl || existingProfile.avatar_url || null;
    const mergedFullName = existingProfile.full_name || fullName;

    const updates: Record<string, any> = {
      github: mergedGithub,
      email: mergedEmail,
      avatar_url: mergedAvatar,
      full_name: mergedFullName,
      updated_at: new Date().toISOString(),
    };

    // If existingProfile was recorded under a different ID (e.g. from GitHub OAuth),
    // re-bind it to the current user.id so all direct lookups match.
    if (existingProfile.id !== user.id) {
      try {
        await admin.from("profiles").delete().eq("id", user.id);
      } catch {
        // Non-blocking
      }
      updates.id = user.id;
    }

    await admin.from("profiles").update(updates).eq("id", existingProfile.id);

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

    return { ...existingProfile, ...updates };
  } else {
    // Brand new user -> insert new profile
    const newProfile = {
      id: user.id,
      email: userEmail || null,
      full_name: fullName,
      avatar_url: avatarUrl,
      github: incomingGithub,
      role: "contributor",
      is_admin: false,
      score: 0,
      merged_prs: 0,
      projects_count: 0,
      badges_created: 0,
    };
    await admin.from("profiles").insert(newProfile);
    return newProfile;
  }
}
