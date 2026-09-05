import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncGitHubContribution } from "@/lib/actions/github";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 1. Verify Vercel Cron Token
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // 2. Fetch all contributor profiles with a linked GitHub username
    const { data: contributors, error } = await admin
      .from("profiles")
      .select("id, github, full_name")
      .eq("role", "contributor")
      .not("github", "is", null);

    if (error) {
      throw new Error(`Failed to fetch contributors: ${error.message}`);
    }

    if (!contributors || contributors.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No contributors with linked GitHub accounts found.",
        synced: 0,
      });
    }

    let successCount = 0;
    const details: any[] = [];

    // 3. Sequentially sync each contributor with rate-limit pacing
    for (const contributor of contributors) {
      if (!contributor.github) continue;

      try {
        const result = await syncGitHubContribution(
          contributor.id,
          contributor.github
        );

        if (result.success) {
          successCount++;
          details.push({
            id: contributor.id,
            github: contributor.github,
            score: result.score,
            merged_prs: result.merged_prs,
          });
        }
      } catch (err: any) {
        console.error(`Sync error for ${contributor.github}:`, err?.message);
      }

      // Small delay between users to avoid GitHub secondary rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      success: true,
      totalContributors: contributors.length,
      syncedSuccessfully: successCount,
      details,
    });
  } catch (err: any) {
    console.error("Leaderboard Cron Sync Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
