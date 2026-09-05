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

    const body = await request.json();
    const github = body.github?.replace(/^@/, "").trim();

    if (!github) {
      return NextResponse.json({ error: "GitHub username is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ github, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, github });
  } catch (err: any) {
    console.error("Link GitHub API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
