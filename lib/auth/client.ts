import { createClient } from "@/lib/supabase/client";

export interface ClientProfilePayload {
  id: string;
  name: string;
  email: string | undefined;
  avatar: string | null;
  role: string;
  isAdmin: boolean;
  github: string | null;
}

/**
 * Initiates client-side OAuth flow with GitHub or Google
 */
export async function signInWithOAuth(
  provider: "github" | "google",
  nextUrl = "/dashboard"
): Promise<{ error?: string }> {
  try {
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;

    const options: any = {
      redirectTo,
      skipBrowserRedirect: true,
    };

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
      return { error: error.message };
    }

    if (data?.url) {
      window.location.href = data.url;
    }

    return {};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : undefined;
    return { error: message || `Failed to initiate ${provider} sign-in` };
  }
}

/**
 * Authenticates user directly using Google Identity Services (GIS) ID Token.
 * The browser communicates directly with Google's native popup/prompt,
 * and exchanges the ID token with Supabase in the background.
 * The Supabase project URL is 100% hidden and never seen by the user.
 */
export async function signInWithGoogleIdToken(
  idToken: string
): Promise<{ error?: string }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) {
      return { error: error.message };
    }

    // Automatically sync and provision profile with deduplication
    try {
      await fetch("/api/auth/sync", {
        method: "POST",
      });
    } catch {
      // Non-blocking
    }

    return {};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : undefined;
    return { error: message || "Failed to sign in with Google ID token" };
  }
}

/**
 * Connects a GitHub account to the currently logged in user.
 * Initiates standard GitHub OAuth (same as Sign In with GitHub),
 * setting an osc_linking_user_id cookie so the callback links this GitHub handle
 * directly to the user's existing profile without identity conflicts.
 */
export async function linkGithubAccount(userId?: string): Promise<{ error?: string }> {
  try {
    if (typeof document !== "undefined" && userId) {
      document.cookie = `osc_linking_user_id=${encodeURIComponent(userId)}; path=/; max-age=600; SameSite=Lax`;
    }
    return await signInWithOAuth("github", "/dashboard?linked=github");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : undefined;
    return { error: message || "Failed to initiate GitHub connection" };
  }
}

/**
 * Saves a manually entered GitHub username to the user's profile via API.
 */
export async function saveGithubUsername(username: string): Promise<{ error?: string }> {
  try {
    const res = await fetch("/api/profile/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ github: username }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error || "Failed to save GitHub username" };
    }

    return {};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : undefined;
    return { error: message || "Failed to save GitHub username" };
  }
}

/**
 * Signs out the current user on the client and redirects to homepage
 */
export async function signOutClient(redirectTo = "/"): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    window.location.href = redirectTo;
  }
}

/**
 * Retrieves the current authenticated user on the client side
 */
export async function getClientUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Retrieves the current user's profile directly via Supabase client
 * Eliminates Server Action roundtrips and prevents UnrecognizedActionError
 */
export async function getClientProfile(): Promise<ClientProfilePayload | null> {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const userEmail = (user.email || user.user_metadata?.email || "").trim().toLowerCase();

    let { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role, is_admin, github")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile && userEmail) {
      const { data: byEmail } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role, is_admin, github")
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

    const identityAvatar =
      user.identities?.find((i: any) => i.identity_data?.avatar_url || i.identity_data?.picture)?.identity_data?.avatar_url ||
      user.identities?.find((i: any) => i.identity_data?.avatar_url || i.identity_data?.picture)?.identity_data?.picture;

    const avatar =
      profile?.avatar_url ||
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      identityAvatar ||
      (github ? `https://avatars.githubusercontent.com/${github}` : null);

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
    };
  } catch (err) {
    console.error("getClientProfile error:", err);
    return null;
  }
}
