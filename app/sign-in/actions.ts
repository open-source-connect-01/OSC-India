"use server";

import { signInWithOAuth } from "@/lib/supabase/auth";

export async function signInWithGithub(nextUrl = "/dashboard") {
  await signInWithOAuth("github", nextUrl);
}

export async function signInWithGoogle(nextUrl = "/dashboard") {
  await signInWithOAuth("google", nextUrl);
}
