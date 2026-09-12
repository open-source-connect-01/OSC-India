import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncGitHubContribution } from "@/lib/actions/github";
import { getDbAllowedRepoSlugs } from "@/lib/actions/projects";
import { normalizeGitHubHandle } from "@/lib/utils/github-helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Verify Vercel Cron Token or query parameter secret
    const authHeader = request.headers.get("authorization");
    const secretParam = searchParams.get("secret");
    const isCronAuthorized =
      !process.env.CRON_SECRET ||
      authHeader === `Bearer ${process.env.CRON_SECRET}` ||
      secretParam === process.env.CRON_SECRET;

    if (!isCronAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // 2. Pre-fetch Allowed Project Repositories strictly ONCE from the DB
    const allowedSlugs = await getDbAllowedRepoSlugs(admin);

    // 3. Check for single user on-demand sync
    const targetUserId = searchParams.get("user_id");
    const targetGithub = searchParams.get("github");

    if (targetUserId && targetGithub) {
      const singleRes = await syncGitHubContribution(targetUserId, targetGithub, allowedSlugs);
      return NextResponse.json({
        success: singleRes.success,
        mode: "single",
        result: singleRes,
      });
    }

    // 4. Batch Size: default 20 contributors per run (stays comfortably within 60s timeout & 30 req/min rate limit)
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const batchSize = Math.min(Math.max(1, isNaN(limitParam) ? 20 : limitParam), 30);

    // 5. Fetch contributors ordered by least recently updated (FIFO queue)
    // This ensures all contributors get refreshed in rotation without duplicate work or starvation
    const { data: contributors, error } = await admin
      .from("profiles")
      .select("id, github, full_name, updated_at")
      .eq("role", "contributor")
      .not("github", "is", null)
      .order("updated_at", { ascending: true })
      .limit(batchSize);

    if (error) {
      throw new Error(`Failed to fetch contributors: ${error.message}`);
    }

    // Fetch total count for reporting
    const { count: totalContributors } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "contributor")
      .not("github", "is", null);

    if (!contributors || contributors.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No contributors found to sync.",
        synced: 0,
        totalContributors: totalContributors || 0,
      });
    }

    let successCount = 0;
    let failedCount = 0;
    let rateLimited = false;
    const details: any[] = [];
    const handleCache = new Map<string, any>();

    // 6. Sequentially sync contributors with rate-limit pacing
    for (let i = 0; i < contributors.length; i++) {
      const contributor = contributors[i];
      const cleanHandle = normalizeGitHubHandle(contributor.github || "");

      if (!cleanHandle) {
        // Advance timestamp so bad handles don't stay at the front of the queue
        await admin
          .from("profiles")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", contributor.id);
        failedCount++;
        continue;
      }

      try {
        let result: any;

        // If another contributor in this batch shared the exact same handle, reuse result
        if (handleCache.has(cleanHandle)) {
          result = handleCache.get(cleanHandle);
          // Still update this profile row with the score
          await admin
            .from("profiles")
            .update({
              github: cleanHandle,
              score: result.score || 0,
              merged_prs: result.merged_prs || 0,
              projects_count: result.projects_count || 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", contributor.id);
        } else {
          result = await syncGitHubContribution(contributor.id, cleanHandle, allowedSlugs);
          handleCache.set(cleanHandle, result);
        }

        if (result?.rateLimited) {
          console.warn("GitHub rate limit encountered. Stopping cron batch early.");
          rateLimited = true;
          break;
        }

        if (result?.success) {
          successCount++;
          details.push({
            id: contributor.id,
            github: cleanHandle,
            score: result.score,
            merged_prs: result.merged_prs,
            projects_count: result.projects_count,
          });
        } else {
          failedCount++;
          // Advance updated_at even on failure so they rotate to the back of the queue
          await admin
            .from("profiles")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", contributor.id);
        }
      } catch (err: any) {
        console.error(`Sync error for ${cleanHandle}:`, err?.message);
        failedCount++;
        await admin
          .from("profiles")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", contributor.id);
      }

      // 2.1-second pause between users to strictly stay under GitHub Search API's 30 req/min limit
      if (i < contributors.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2100));
      }
    }

    return NextResponse.json({
      success: true,
      batchSize: contributors.length,
      syncedSuccessfully: successCount,
      failed: failedCount,
      totalContributors: totalContributors || contributors.length,
      rateLimited,
      allowedProjectsCount: allowedSlugs.size,
      details,
    });
  } catch (err: any) {
    console.error("Leaderboard Cron Sync Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
