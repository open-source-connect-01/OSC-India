"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function fetchNavProfile() {
  const supabase = await createClient();
  
  // 1. Check Supabase Auth
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, full_name, email, avatar_url, role, is_admin, github")
      .eq("id", user.id)
      .maybeSingle();

    return {
      id: user.id,
      name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
      email: user.email,
      avatar: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      role: profile?.role || "contributor",
      isAdmin: Boolean(profile?.is_admin || profile?.role === "admin"),
      github: profile?.github || user.user_metadata?.user_name || null,
    };
  }

  return null;
}
