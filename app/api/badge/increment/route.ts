import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // 1. Fetch current count
    const { data: profile, error: fetchErr } = await admin
      .from("profiles")
      .select("badges_created")
      .eq("id", user.id)
      .single();

    if (fetchErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const currentCount = profile.badges_created || 0;
    if (currentCount >= 3) {
      return NextResponse.json(
        {
          error: "Maximum badge creation limit reached (3 badges per account).",
          count: currentCount,
        },
        { status: 400 }
      );
    }

    // 2. Increment count
    const newCount = currentCount + 1;
    const { error: updateErr } = await admin
      .from("profiles")
      .update({ badges_created: newCount, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: newCount });
  } catch (err: any) {
    console.error("Badge increment API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
