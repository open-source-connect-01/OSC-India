"use server";

import { getAuthenticatedProfile, signOutServer } from "@/lib/auth/server";

export async function signOutAction() {
  await signOutServer();
}

export async function fetchNavProfile() {
  return await getAuthenticatedProfile();
}
