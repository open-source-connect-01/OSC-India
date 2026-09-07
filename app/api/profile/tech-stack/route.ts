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
    const languages = body.languages;

    if (!languages || !Array.isArray(languages)) {
      return NextResponse.json({ error: "Invalid languages data" }, { status: 400 });
    }

    const admin = createAdminClient();
    let { error } = await admin
      .from("profiles")
      .update({ tech_stack: languages, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    // If updated_at column does not exist in schema, retry without it
    if (error && (error.message?.includes("updated_at") || error.code === "42703")) {
      const retry = await admin
        .from("profiles")
        .update({ tech_stack: languages })
        .eq("id", user.id);
      error = retry.error;
    }

    if (error) {
      console.error("Save tech stack API database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Save tech stack API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
