import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Direct route handler to initiate Google OAuth flow.
 * Allows navigating to /auth/google?next=/dashboard from anywhere in the application.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("Google OAuth initiation error:", error.message);
      return NextResponse.redirect(
        `${origin}/sign-in?error=${encodeURIComponent(error.message)}`
      );
    }

    if (data?.url) {
      return NextResponse.redirect(data.url);
    }

    return NextResponse.redirect(`${origin}/sign-in?error=OAuthInitFailed`);
  } catch (err: any) {
    console.error("Google OAuth route exception:", err);
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(err?.message || "Failed to start Google sign-in")}`
    );
  }
}
