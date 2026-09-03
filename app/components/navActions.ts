"use server";

import { auth, signOut } from "@/auth";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function fetchNavProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("user_id", session.user.id)
    .maybeSingle();

  const { data: userData } = await supabase
    .from("users")
    .select("roles ( name )")
    .eq("id", session.user.id)
    .maybeSingle();

  return {
    name: profile?.full_name || session.user.name || "User",
    email: session.user.email,
    avatar: profile?.avatar_url || session.user.image,
    role: (userData as any)?.roles?.name || "Contributor",
  };
}

