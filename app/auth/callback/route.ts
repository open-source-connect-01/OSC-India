import { createClient } from "@/lib/supabase/server";
import { syncUserProfile } from "@/lib/auth/syncProfile";
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
          await syncUserProfile(user);
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
