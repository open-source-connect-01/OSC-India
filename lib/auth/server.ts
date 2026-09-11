"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Profile } from "@/lib/supabase/database";

export interface AuthenticatedUserPayload {
  id: string;
  name: string;
  email: string | undefined;
  avatar: string | null;
  role: string;
  isAdmin: boolean;
  github: string | null;
  score: number;
  mergedPRs: number;
  projectsCount: number;
  badgesCreated: number;
}

/**
 * Validates session and returns verified Supabase user
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Fetches authenticated user and their profile data
 */
export async function getAuthenticatedProfile(): Promise<AuthenticatedUserPayload | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const admin = createAdminClient();
  const userEmail = (user.email || user.user_metadata?.email || "").trim().toLowerCase();

  let { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile && userEmail) {
    const { data: byEmail } = await admin
      .from("profiles")
      .select("*")
      .ilike("email", userEmail)
      .maybeSingle();
    if (byEmail) profile = byEmail;
  }

  const fullName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  const github =
    profile?.github ||
    user.user_metadata?.user_name ||
    user.user_metadata?.preferred_username ||
    null;

  const avatar =
    profile?.avatar_url ||
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  const role = profile?.role || "contributor";
  const isAdmin = Boolean(profile?.is_admin || profile?.role === "admin");

  return {
    id: user.id,
    name: fullName,
    email: user.email,
    avatar,
    role,
    isAdmin,
    github,
    score: profile?.score || 0,
    mergedPRs: profile?.merged_prs || 0,
    projectsCount: profile?.projects_count || 0,
    badgesCreated: profile?.badges_created || 0,
  };
}

/**
 * Server-side Sign Out action
 */
export async function signOutServer() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Server-side action to initiate OAuth sign-in (e.g. Google or GitHub).
 */
export async function signInWithOAuthServerAction(
  provider: "google" | "github",
  nextUrl = "/dashboard"
) {
  const supabase = await createClient();
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const proto = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = headersList.get("origin") || `${proto}://${host}`;

  const safeNext = nextUrl.startsWith("/") && !nextUrl.startsWith("//") ? nextUrl : "/dashboard";
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const options: any = { redirectTo };
  if (provider === "github") {
    options.scopes = "read:user user:email";
  } else if (provider === "google") {
    options.queryParams = {
      access_type: "offline",
      prompt: "consent",
    };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options,
  });

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  if (data?.url) {
    redirect(data.url);
  }
}

