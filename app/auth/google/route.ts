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
  return NextResponse.redirect(`${origin}/sign-in?next=${encodeURIComponent(next)}`);
}
