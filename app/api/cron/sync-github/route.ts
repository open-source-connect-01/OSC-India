import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncGitHubContribution } from "@/lib/actions/github";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 1. Verify Vercel Cron Token (or allow authorized triggers)
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // 2. Fetch all active contributor profiles with linked GitHub handles
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
    const results: any[] = [];

    // 3. Sequentially sync each contributor with a 500ms delay to respect rate limits
    for (const contributor of contributors) {
      if (!contributor.github) continue;

      try {
        const syncResult = await syncGitHubContribution(
          contributor.id,
          contributor.github
        );

        if (syncResult.success) {
          successCount++;
          results.push({
            id: contributor.id,
            github: contributor.github,
            score: syncResult.score,
            merged_prs: syncResult.merged_prs,
          });
        }
      } catch (syncErr: any) {
        console.error(`Error syncing user @${contributor.github}:`, syncErr.message);
      }

      // Brief delay to prevent burst rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      success: true,
      totalContributors: contributors.length,
      syncedSuccessfully: successCount,
      results,
    });
  } catch (err: any) {
    console.error("GitHub Cron Sync Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
