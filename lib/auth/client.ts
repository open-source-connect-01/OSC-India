import { createClient } from "@/lib/supabase/client";

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
  } catch (err: any) {
    return { error: err.message || `Failed to initiate ${provider} sign-in` };
  }
}

/**
 * Signs in with email and password
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to sign in" };
  }
}

/**
 * Registers a new user with email, password, and profile metadata
 */
export async function signUpWithPassword(
  email: string,
  password: string,
  fullName?: string,
  github?: string
): Promise<{ success: boolean; hasSession: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const emailRedirectTo = `${origin}/auth/callback?next=/dashboard`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split("@")[0],
          name: fullName || email.split("@")[0],
          user_name: github || undefined,
        },
        emailRedirectTo,
      },
    });

    if (error) {
      return { success: false, hasSession: false, error: error.message };
    }

    return {
      success: true,
      hasSession: Boolean(data.session),
    };
  } catch (err: any) {
    return { success: false, hasSession: false, error: err.message || "Failed to create account" };
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
