import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUserProfile } from "@/lib/auth/syncProfile";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await syncUserProfile(user);
    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    console.error("Auth sync error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to synchronize profile" },
      { status: 500 }
    );
  }
}
