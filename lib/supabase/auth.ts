"use server";

import { createClient } from "./server";
import { redirect } from "next/navigation";

/**
 * Initiates OAuth sign-in (e.g., GitHub, Google)
 */
export async function signInWithOAuth(provider: "github" | "google", nextUrl = "/dashboard") {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
    },
  });

  if (error) {
    console.error(`Error signing in with ${provider}:`, error.message);
    throw new Error(error.message);
  }

  if (data?.url) {
    redirect(data.url);
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

/**
 * Sign up with email, password, and profile metadata
 */
export async function signUpWithEmail(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const github = formData.get("github") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || splitEmail(email),
        user_name: github || undefined,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

/**
 * Signs out the current user and redirects to homepage
 */
export async function signOutUser() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Gets the current authenticated user validated against Supabase
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Gets the current session
 */
export async function getCurrentSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

function splitEmail(email: string) {
  return email.split("@")[0];
}
