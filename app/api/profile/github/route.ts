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
    const userEmail = (user.email || user.user_metadata?.email || "").trim().toLowerCase();

    // 1. Check for existing profile by user.id or email
    let { data: existingProfile } = await admin
      .from("profiles")
      .select("id, email, github")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingProfile && userEmail) {
      const { data: byEmail } = await admin
        .from("profiles")
        .select("id, email, github")
        .ilike("email", userEmail)
        .maybeSingle();
      if (byEmail) existingProfile = byEmail;
    }

    if (existingProfile) {
      await admin
        .from("profiles")
        .update({ github, updated_at: new Date().toISOString() })
        .eq("id", existingProfile.id);

      if (userEmail) {
        await admin
          .from("profiles")
          .update({ github, updated_at: new Date().toISOString() })
          .ilike("email", userEmail);
      }
    } else {
      await admin.from("profiles").insert({
        id: user.id,
        email: userEmail || user.email || "",
        github,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || "Contributor",
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        role: "contributor",
        score: 0,
        merged_prs: 0,
        projects_count: 0,
        badges_created: 0,
      });
    }

    // 3. Sync auth metadata
    try {
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          github,
        },
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({ success: true, github });
  } catch (err: any) {
    console.error("Link GitHub API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
