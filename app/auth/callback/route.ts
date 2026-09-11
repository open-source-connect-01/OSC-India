import { createClient } from "@/lib/supabase/server";
import { syncUserProfile } from "@/lib/auth/syncProfile";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Dynamically resolve public origin respecting reverse proxy headers (e.g. Vercel, Cloudflare)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const isLocalEnv = process.env.NODE_ENV === "development" && !forwardedHost;
  const origin = isLocalEnv
    ? requestUrl.origin
    : forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin;

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

      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Supabase OAuth code exchange error:", error.message);
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}/sign-in?error=AuthCodeMissing`);
}
