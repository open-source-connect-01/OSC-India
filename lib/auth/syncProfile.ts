import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";
import { syncGitHubContribution } from "@/lib/actions/github";
import type { Profile } from "@/lib/supabase/database";
import { isOfficialProjectAdminEmail, isOfficialProjectAdminHandle } from "@/lib/utils/github-helpers";

function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

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

  // 1. Optional public.users record (best effort)
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
  } catch {
    // Non-blocking if public.users table is not used
  }

  // 2. Search existing profile by user_id or id first
  let existingProfile: Profile | null = null;
  const { data: byId } = await admin
    .from("profiles")
    .select("*")
    .or(`user_id.eq.${user.id},id.eq.${user.id}`)
    .maybeSingle();

  if (byId) {
    existingProfile = byId as Profile;
  }

  // 3. Fallback: search by GitHub handle if still not found
  if (!existingProfile && incomingGithub) {
    const cleanGh = incomingGithub.replace(/^@+/, "").trim().toLowerCase();
    const { data: byGithub } = await admin
      .from("profiles")
      .select("*")
      .ilike("github", cleanGh)
      .maybeSingle();
    if (byGithub) existingProfile = byGithub as Profile;
  }

  // 4. Fallback: search by email if still not found
  if (!existingProfile && userEmail) {
    const { data: byEmail } = await admin
      .from("profiles")
      .select("*")
      .ilike("email", userEmail)
      .maybeSingle();
    if (byEmail) existingProfile = byEmail as Profile;
  }

  const mergedGithub = incomingGithub ? incomingGithub.replace(/^@+/, "").trim().toLowerCase() : existingProfile?.github || null;
  const mergedAvatar = avatarUrl || existingProfile?.avatar_url || null;
  const mergedFullName = existingProfile?.full_name && existingProfile.full_name !== "Contributor" ? existingProfile.full_name : fullName;

  // Root Super Admin and Project Admin role resolution
  const adminEmail = (process.env.ADMIN_PORTAL_EMAIL || "sayanghosh1887@gmail.com").toLowerCase().trim();
  const isRootAdmin = Boolean(userEmail && userEmail === adminEmail);
  const isProjAdmin = isOfficialProjectAdminEmail(userEmail) || isOfficialProjectAdminHandle(mergedGithub);

  let resolvedRole: "contributor" | "mentor" | "project-admin" | "admin" = "contributor";
  if (isRootAdmin) {
    resolvedRole = "admin";
  } else if (isProjAdmin) {
    resolvedRole = "project-admin";
  } else if (existingProfile?.role && existingProfile.role !== "contributor") {
    resolvedRole = existingProfile.role;
  } else {
    resolvedRole = (existingProfile?.role as "contributor" | "mentor" | "project-admin" | "admin") || "contributor";
  }

  const isElevated = resolvedRole === "admin" || resolvedRole === "project-admin";

  const profileRow: Partial<Profile> = {
    id: user.id,
    user_id: user.id,
    email: userEmail || existingProfile?.email || null,
    full_name: mergedFullName,
    avatar_url: mergedAvatar,
    github: mergedGithub,
    role: resolvedRole,
    is_admin: resolvedRole === "admin",
    score: isElevated ? 0 : (existingProfile?.score ?? 0),
    merged_prs: isElevated ? 0 : (existingProfile?.merged_prs ?? 0),
    projects_count: existingProfile?.projects_count ?? 0,
    badges_created: existingProfile?.badges_created ?? 0,
    tech_stack: existingProfile?.tech_stack || [],
    updated_at: new Date().toISOString(),
  };

  // If existingProfile was found under a legacy or seed id, clear old unique fields and migrate
  if (existingProfile && existingProfile.id !== user.id) {
    try {
      await admin
        .from("profiles")
        .update({ github: null, email: null })
        .eq("id", existingProfile.id);

      await admin
        .from("contributions")
        .update({ user_id: user.id })
        .eq("user_id", existingProfile.id);
    } catch (e) {
      console.warn("Notice: legacy profile transfer warning:", e);
    }
  }

  // Upsert the authoritative profile row keyed by user.id (PK)
  const { error: upsertErr } = await admin
    .from("profiles")
    .upsert(profileRow, { onConflict: "id" });

  if (upsertErr) {
    console.error("public.profiles upsert error:", upsertErr.message);
    // Fallback: try update directly
    const { error: updateErr } = await admin
      .from("profiles")
      .update(profileRow)
      .or(`id.eq.${user.id},user_id.eq.${user.id}`);
    if (updateErr) {
      console.error("public.profiles update fallback error:", updateErr.message);
    }
  }

  // Also synchronize auth metadata so auth.users reflects the unified profile
  try {
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        github: mergedGithub,
        full_name: mergedFullName,
        avatar_url: mergedAvatar,
        role: resolvedRole,
        is_admin: resolvedRole === "admin",
      },
    });
  } catch {
    // Non-blocking
  }

  // Decoupled, non-blocking GitHub contribution sync on login (with 30m cooldown)
  // Ensures login returns instantly and prevents thundering herd API rate limits under 10k users
  if (mergedGithub) {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const isFresh = existingProfile?.updated_at && existingProfile.updated_at > thirtyMinAgo;

    if (!isFresh) {
      const baseUrl = getAppBaseUrl();
      fetch(`${baseUrl}/api/sync/background`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sync-secret": process.env.CRON_SECRET || "",
        },
        body: JSON.stringify({ userId: user.id, github: mergedGithub }),
      }).catch(() => {
        // Fallback: in-process non-blocking attempt if network call is unavailable
        void syncGitHubContribution(user.id, mergedGithub).catch(() => {});
      });
    }
  }

  return { ...existingProfile, ...profileRow, email: userEmail };
}
