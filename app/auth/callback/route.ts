import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
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
          const github =
            user.user_metadata?.user_name ||
            user.user_metadata?.preferred_username ||
            null;
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Contributor";
          const avatarUrl =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            null;

          const { data: existingProfile } = await admin
            .from("profiles")
            .select("id, github, avatar_url, full_name")
            .eq("id", user.id)
            .maybeSingle();

          if (!existingProfile) {
            await admin.from("profiles").insert({
              id: user.id,
              email: user.email,
              full_name: fullName,
              avatar_url: avatarUrl,
              github: github,
              role: "contributor",
              is_admin: false,
              score: 0,
              merged_prs: 0,
              projects_count: 0,
              badges_created: 0,
            });
          } else {
            const updates: Record<string, any> = {};
            if (!existingProfile.github && github) updates.github = github;
            if (!existingProfile.avatar_url && avatarUrl) updates.avatar_url = avatarUrl;
            if (!existingProfile.full_name && fullName) updates.full_name = fullName;
            if (Object.keys(updates).length > 0) {
              await admin.from("profiles").update(updates).eq("id", user.id);
            }
          }
        }
      } catch (profileErr: any) {
        console.error("Profile auto-provisioning warning:", profileErr?.message);
        // Non-blocking so user can still access session
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
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
