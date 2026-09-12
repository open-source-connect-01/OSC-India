import { NextResponse } from "next/server";
import { syncGitHubContribution, syncAllProjectsAndContributors } from "@/lib/actions/github";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 5-Hour Leaderboard Sync Cron Handler
 * Configured in vercel.json with schedule: "0 *\/5 * * *"
 *
 * Runs a fast, repo-centric loop across all competition repositories (~17 repos)
 * using the GitHub REST API (5,000 req/hr limit). Aggregates merged PRs and
 * updates scores, merged PRs, and repo counts for all 608 contributors in seconds.
 */
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

    // 2. Check for single user on-demand sync (e.g. ?user_id=...&github=...)
    const targetUserId = searchParams.get("user_id");
    const targetGithub = searchParams.get("github");

    if (targetUserId && targetGithub) {
      const singleRes = await syncGitHubContribution(targetUserId, targetGithub);
      return NextResponse.json({
        success: singleRes.success,
        mode: "single",
        result: singleRes,
      });
    }

    // 3. Run the full 5-hour sync loop across all tracked projects and contributors
    const result = await syncAllProjectsAndContributors();

    return NextResponse.json({
      mode: "5-hour-full-sync",
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Leaderboard 5-Hour Cron Sync Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
