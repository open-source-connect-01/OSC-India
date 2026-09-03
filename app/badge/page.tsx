import React, { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import BadgeClient from "./BadgeClient";

export const dynamic = "force-dynamic";

export default async function BadgePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, role, badges_created")
    .eq("id", user.id)
    .single();

  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-white font-sans">Loading Badge Studio...</div>}>
      <BadgeClient
        userId={user.id}
        initialRole={profile?.role || "contributor"}
        initialName={profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || ""}
        initialAvatar={profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || ""}
        initialBadgesCreated={profile?.badges_created || 0}
      />
    </Suspense>
  );
}
