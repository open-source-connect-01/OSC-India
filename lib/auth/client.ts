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

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
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
 * Links a GitHub identity to the currently authenticated user via Supabase OAuth.
 * After linking, the auth callback will sync the github handle to profiles.
 */
export async function linkGithubAccount(): Promise<{ error?: string }> {
  try {
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectTo = `${origin}/auth/callback?next=/dashboard`;

    const { data, error } = await supabase.auth.linkIdentity({
      provider: "github",
      options: {
        redirectTo,
      },
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
    return { error: message || "Failed to link GitHub account" };
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role, is_admin, github")
      .eq("id", user.id)
      .maybeSingle();

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
    };
  } catch (err) {
    console.error("getClientProfile error:", err);
    return null;
  }
}
