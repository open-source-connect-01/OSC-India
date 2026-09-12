const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if (val.startsWith("\"") && val.endsWith("\"")) val = val.slice(1, -1);
      process.env[match[1].trim()] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase configuration");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey);

// GitHub auth headers
const token = process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PAT;
const headers = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "OSC-India-Contributions-Backfill",
};
if (token) {
  headers.Authorization = `Bearer ${token}`;
} else {
  const clientId = process.env.GITHUB_ID || process.env.AUTH_GITHUB_ID;
  const clientSecret = process.env.GITHUB_SECRET || process.env.AUTH_GITHUB_SECRET;
  if (clientId && clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  }
}

const DIFFICULTY_POINTS = {
  easy: 10,
  medium: 20,
  hard: 30,
  expert: 50,
};

const DIFFICULTY_RANK = {
  easy: 1,
  medium: 2,
  hard: 3,
  expert: 4,
};

function detectDifficulty(item) {
  const text = `${item.title || ""} ${item.body || ""}`.toLowerCase();
  const labelNames = (item.labels || []).map((l) => (typeof l === "string" ? l : l.name || "").toLowerCase());

  if (labelNames.some((l) => l.includes("expert") || l.includes("advanced")) || text.includes("difficulty: expert")) {
    return "expert";
  }
  if (labelNames.some((l) => l.includes("hard") || l.includes("complex")) || text.includes("difficulty: hard")) {
    return "hard";
  }
  if (labelNames.some((l) => l.includes("medium") || l.includes("intermediate")) || text.includes("difficulty: medium")) {
    return "medium";
  }
  return "easy";
}

function normalizeGitHubHandle(handle) {
  if (!handle) return "";
  let clean = handle.trim();
  clean = clean.replace(/^https?:\/\/github\.com\//i, "");
  clean = clean.replace(/^@/, "");
  clean = clean.split(/[/?#]/)[0].trim();
  return clean.toLowerCase();
}

async function main() {
  console.log("=== Fast Sweep Backfill for public.contributions & public.leaderboard_stats ===");

  // 1. Fetch official 17 projects
  const { data: projects, error: pErr } = await admin.from("projects").select("id, name, github_repo_url");
  if (pErr || !projects) {
    console.error("Failed to load projects:", pErr);
    process.exit(1);
  }

  const projectMap = new Map(); // slug -> project
  for (const p of projects) {
    const slug = p.github_repo_url.replace(/^https?:\/\/github\.com\//i, "").replace(/\/+$/, "").toLowerCase();
    projectMap.set(slug, p);
  }
  console.log(`Loaded ${projectMap.size} official projects from database.`);

  // 2. Fetch all profiles & build handle -> user_id mapping
  const { data: profiles, error: profErr } = await admin.from("profiles").select("id, user_id, github");
  if (profErr || !profiles) {
    console.error("Failed to load profiles:", profErr);
    process.exit(1);
  }

  const handleToUserId = new Map();
  for (const prof of profiles) {
    const handle = normalizeGitHubHandle(prof.github);
    if (handle) {
      handleToUserId.set(handle, prof.user_id);
    }
  }
  console.log(`Mapped ${handleToUserId.size} unique GitHub handles to user_ids.`);

  // 3. Fast Core REST API sweep of 17 competition repositories (uses 5,000 req/hr limit)
  const allContributionsToUpsert = [];
  const userScoreMap = new Map(); // user_id -> { totalPoints: number, prCount: number, repos: Set<string> }

  for (const [slug, project] of projectMap.entries()) {
    console.log(`Scanning repo: ${slug}...`);
    let page = 1;
    let repoPrCount = 0;

    while (page <= 10) {
      try {
        const url = `https://api.github.com/repos/${slug}/pulls?state=closed&per_page=100&page=${page}&sort=updated&direction=desc`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          console.warn(`Error on ${slug} page ${page}: ${res.status}`);
          break;
        }

        const pulls = await res.json();
        if (!Array.isArray(pulls) || pulls.length === 0) break;

        for (const pr of pulls) {
          if (!pr.merged_at) continue; // Only merged PRs
          const author = normalizeGitHubHandle(pr.user?.login);
          if (!author || !handleToUserId.has(author)) continue; // Only registered users

          const userId = handleToUserId.get(author);
          const diff = detectDifficulty(pr);
          const points = DIFFICULTY_POINTS[diff];
          const mergedAt = pr.merged_at || pr.closed_at || new Date().toISOString();

          allContributionsToUpsert.push({
            user_id: userId,
            project_id: project.id,
            type: "pr",
            github_url: pr.html_url,
            status: "merged",
            points_awarded: points,
            contributed_at: mergedAt,
          });

          if (!userScoreMap.has(userId)) {
            userScoreMap.set(userId, { totalPoints: 0, prCount: 0, repos: new Set() });
          }
          const userStats = userScoreMap.get(userId);
          userStats.totalPoints += points;
          userStats.prCount += 1;
          userStats.repos.add(slug);

          repoPrCount++;
        }

        if (pulls.length < 100) break;
        page++;
      } catch (err) {
        console.error(`Fetch exception for ${slug} page ${page}:`, err.message);
        break;
      }
    }
    console.log(`  -> Found ${repoPrCount} registered user merged PRs on ${slug}.`);
  }

  console.log(`\nTotal matched contributions: ${allContributionsToUpsert.length} across ${userScoreMap.size} users.`);

  // 4. Batch upsert into public.contributions (chunks of 100)
  for (let i = 0; i < allContributionsToUpsert.length; i += 100) {
    const chunk = allContributionsToUpsert.slice(i, i + 100);
    const { error: cErr } = await admin.from("contributions").upsert(chunk, { onConflict: "github_url" });
    if (cErr) {
      console.error(`Error upserting contributions chunk ${i}:`, cErr.message);
    } else {
      console.log(`Upserted contributions chunk ${i} - ${i + chunk.length}`);
    }
  }

  // 5. Update public.leaderboard_stats and public.profiles for active users
  const leaderboardStats = [];
  for (const [userId, stats] of userScoreMap.entries()) {
    leaderboardStats.push({
      user_id: userId,
      total_points: stats.totalPoints,
      current_streak: 1,
      updated_at: new Date().toISOString(),
    });

    // Update profiles
    await admin
      .from("profiles")
      .update({
        score: stats.totalPoints,
        merged_prs: stats.prCount,
        projects_count: stats.repos.size,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }

  // Upsert leaderboard stats in chunks
  for (let i = 0; i < leaderboardStats.length; i += 100) {
    const chunk = leaderboardStats.slice(i, i + 100);
    const { error: lErr } = await admin.from("leaderboard_stats").upsert(chunk, { onConflict: "user_id" });
    if (lErr) {
      console.error(`Error upserting leaderboard_stats chunk ${i}:`, lErr.message);
    }
  }

  console.log("\n=== Final Verification ===");
  const { count: finalContribs } = await admin.from("contributions").select("*", { count: "exact", head: true });
  console.log(`Total rows in public.contributions: ${finalContribs}`);
  console.log(`Total active contributors with points: ${userScoreMap.size}`);
}

main();
