import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (errorParam) {
    console.error("Auth provider callback error:", errorParam, errorDescription);
    const message = errorDescription || errorParam;
    return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(message)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Ensure user profile exists in public.profiles (guaranteed auto-provisioning)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
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
                // Delete any empty stub row that may have been created for current user.id
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
          } else {
            // Brand new user -> insert new profile
            await admin.from("profiles").insert({
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
            });
          }
        }
      } catch (profileErr: any) {
        console.error("Profile auto-provisioning warning:", profileErr?.message);
        // Non-blocking so user can still access session
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`${forwardedProto}://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }

    console.error("Supabase OAuth code exchange error:", error.message);
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}/sign-in?error=AuthCodeMissing`);
}
