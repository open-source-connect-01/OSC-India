const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// 1. Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if (val.startsWith("\"") && val.endsWith("\"")) val = val.slice(1, -1);
      if (val.startsWith("\x27") && val.endsWith("\x27")) val = val.slice(1, -1);
      process.env[match[1].trim()] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase configuration in environment.");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey);

// 2. Setup GitHub auth headers
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

async function resolvePrDifficulty(slug, pr, headers, prDetailsCache) {
  // 1. Check explicit maintainer level labels on the PR first
  const labelNames = (pr.labels || [])
    .map((l) => (typeof l === "string" ? l : l.name || "").toLowerCase())
    .join(" ");

  if (/expert|level[- :_]?4\b|lvl[- :_]?4\b|level4|lvl4|difficulty[- :_]+expert/i.test(labelNames)) {
    return "expert";
  }
  if (/hard\b|difficulty[- :_]+hard|level[- :_]?3\b|lvl[- :_]?3\b|level3|lvl3/i.test(labelNames)) {
    return "hard";
  }
  if (/medium|med\b|intermediate|mid\b|difficulty[- :_]+medium|level[- :_]?2\b|lvl[- :_]?2\b|level2|lvl2/i.test(labelNames)) {
    return "medium";
  }
  if (/easy|beginner|starter|good[ -]?first[ -]?issue|difficulty[- :_]+easy|level[- :_]?1\b|lvl[- :_]?1\b|level1|lvl1/i.test(labelNames)) {
    return "easy";
  }

  // 2. Check title or body keywords
  const fullText = `${pr.title || ""} ${pr.body || ""}`.toLowerCase();
  if (/\[expert\]|\(expert\)|level[- :_]?4\b|difficulty:\s*expert/i.test(fullText)) return "expert";
  if (/\[hard\]|\(hard\)|level[- :_]?3\b|difficulty:\s*hard/i.test(fullText)) return "hard";
  if (/\[medium\]|\(medium\)|\[med\]|\(med\)|level[- :_]?2\b|difficulty:\s*medium/i.test(fullText)) return "medium";
  if (/\[easy\]|\(easy\)|level[- :_]?1\b|good[ -]?first[ -]?issue|difficulty:\s*easy/i.test(fullText)) return "easy";

  // 3. Fetch PR additions + deletions to determine difficulty by code change size
  const prCacheKey = `${slug}#${pr.number}`;
  let additions = pr.additions;
  let deletions = pr.deletions;

  if (additions === undefined || deletions === undefined) {
    if (prDetailsCache && prDetailsCache.has(prCacheKey)) {
      const cached = prDetailsCache.get(prCacheKey);
      additions = cached.additions;
      deletions = cached.deletions;
    } else {
      try {
        const detailRes = await fetch(`https://api.github.com/repos/${slug}/pulls/${pr.number}`, { headers });
        if (detailRes.ok) {
          const detail = await detailRes.json();
          additions = detail.additions || 0;
          deletions = detail.deletions || 0;
          if (prDetailsCache) prDetailsCache.set(prCacheKey, { additions, deletions });
        }
      } catch {
        additions = 0;
        deletions = 0;
      }
    }
  }

  const totalLines = (additions || 0) + (deletions || 0);
  if (totalLines >= 800) return "expert"; // 50 pts
  if (totalLines >= 250) return "hard";   // 30 pts
  if (totalLines >= 50) return "medium";  // 20 pts
  return "easy";                          // 10 pts
}

function normalizeGitHubHandle(handle) {
  if (!handle) return "";
  let clean = handle.trim();
  clean = clean.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  clean = clean.replace(/^@+/, "");
  clean = clean.split(/[/?#]/)[0].trim();
  return clean.toLowerCase();
}

function normalizeRepoSlug(url) {
  if (!url) return "";
  let clean = url.trim();
  clean = clean.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  clean = clean.replace(/\/+$/, "");
  return clean;
}

async function main() {
  console.log("=== OSCI'26 Full Participant Sweep (Open & Merged PRs) ===");

  // 1. Fetch official projects from DB
  const { data: projects, error: pErr } = await admin.from("projects").select("id, name, github_repo_url");
  if (pErr || !projects) {
    console.error("Failed to load projects:", pErr);
    process.exit(1);
  }

  const projectMap = new Map(); // slug -> project
  const repoOwnerMap = new Map(); // slug -> ownerHandle
  const adminHandles = new Set();

  for (const p of projects) {
    const slug = normalizeRepoSlug(p.github_repo_url);
    if (!slug) continue;
    projectMap.set(slug, p);
    const owner = slug.split("/")[0].toLowerCase().trim();
    repoOwnerMap.set(slug, owner);
    adminHandles.add(owner);
  }
  console.log(`Loaded ${projectMap.size} official competition projects from database.`);

  // 2. Fetch all profiles with complete pagination & build handle -> profile mapping
  const profiles = [];
  let pageP = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data: chunk, error: profErr } = await admin
      .from("profiles")
      .select("*")
      .range(pageP * PAGE_SIZE, (pageP + 1) * PAGE_SIZE - 1);
    if (profErr) {
      console.error("Failed to load profiles chunk:", profErr);
      process.exit(1);
    }
    if (!chunk || chunk.length === 0) break;
    profiles.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
    pageP++;
  }
  console.log(`Loaded ${profiles.length} total user profiles from database.`);

  const handleToProfile = new Map();
  const userIdToProfile = new Map();
  for (const prof of profiles) {
    if (prof.id) userIdToProfile.set(prof.id, prof);
    if (prof.user_id) userIdToProfile.set(prof.user_id, prof);
    const handle = normalizeGitHubHandle(prof.github);
    if (handle) {
      handleToProfile.set(handle, prof);
    }
  }

  // Build fallback email/name mapping from auth.users for accounts without explicit github field set
  const fallbackHandleMap = new Map();
  let authPage = 1;
  while (true) {
    const { data: authData } = await admin.auth.admin.listUsers({ page: authPage, perPage: 1000 });
    if (!authData?.users || authData.users.length === 0) break;
    for (const u of authData.users) {
      const email = (u.email || "").toLowerCase().trim();
      const emailPrefix = email.split("@")[0];
      const prof = userIdToProfile.get(u.id);
      if (prof && !prof.github) {
        if (emailPrefix) fallbackHandleMap.set(emailPrefix, prof);
        const metaGh = normalizeGitHubHandle(u.user_metadata?.github || u.user_metadata?.user_name || u.user_metadata?.preferred_username);
        if (metaGh) fallbackHandleMap.set(metaGh, prof);
      }
    }
    if (authData.users.length < 1000) break;
    authPage++;
  }
  console.log(`Mapped ${handleToProfile.size} unique GitHub handles + ${fallbackHandleMap.size} fallback account matches.`);

  // Ensure project admins have role = 'project-admin'
  for (const adminHandle of adminHandles) {
    let prof = handleToProfile.get(adminHandle) || fallbackHandleMap.get(adminHandle);
    if (!prof) {
      const newId = crypto.randomUUID();
      const name = adminHandle.charAt(0).toUpperCase() + adminHandle.slice(1);
      const { data: created } = await admin.from("profiles").insert({
        id: newId,
        user_id: newId,
        full_name: name,
        github: adminHandle,
        role: "project-admin",
        score: 0,
        merged_prs: 0,
        projects_count: 1,
        badges_created: 0,
        tech_stack: [],
      }).select("*").maybeSingle();
      if (created) {
        prof = created;
        handleToProfile.set(adminHandle, prof);
        console.log("Created project-admin profile for:", adminHandle);
      }
    } else if (prof.role !== "project-admin" && prof.role !== "admin") {
      await admin.from("profiles").update({ role: "project-admin" }).eq("id", prof.id);
      prof.role = "project-admin";
      console.log("Promoted to project-admin:", adminHandle);
    }
  }

  // 3. Sweep all pull requests (open + merged) across official competition repositories
  const verifiedContributions = [];
  const contributorStats = new Map(); // userId -> { points, count, mergedCount, openCount, repos: Set }
  const prDetailsCache = new Map();
  let reposScanned = 0;

  for (const [exactSlug, project] of projectMap.entries()) {
    reposScanned++;
    let page = 1;
    let repoPrsFound = 0;

    while (page <= 5) {
      try {
        const url = `https://api.github.com/repos/${exactSlug}/pulls?state=all&per_page=100&page=${page}&sort=updated&direction=desc`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          if (res.status === 404) {
            console.warn(`[Skip] Repository ${exactSlug} returned 404 (private/renamed).`);
          } else {
            console.warn(`[Notice] ${exactSlug} page ${page} returned status ${res.status}`);
          }
          break;
        }

        const pulls = await res.json();
        if (!Array.isArray(pulls) || pulls.length === 0) break;

        for (const pr of pulls) {
          // Ignore closed PRs that were not merged (rejected/spam PRs)
          if (pr.state === "closed" && !pr.merged_at) continue;

          const author = normalizeGitHubHandle(pr.user?.login);
          if (!author) continue;

          let authorProf = handleToProfile.get(author) || fallbackHandleMap.get(author);
          
          // Only score registered contributors (admins/project-admins do not compete on leaderboard)
          if (!authorProf || authorProf.role === "admin" || authorProf.role === "project-admin") {
            continue;
          }

          const diff = await resolvePrDifficulty(exactSlug, pr, headers, prDetailsCache);
          const points = DIFFICULTY_POINTS[diff];
          const prDate = pr.merged_at || pr.created_at || new Date().toISOString();
          const uid = authorProf.user_id || authorProf.id;
          const status = pr.merged_at ? "merged" : "open";

          repoPrsFound++;

          // Add to contributions list
          verifiedContributions.push({
            user_id: uid,
            project_id: project.id,
            type: "pr",
            github_url: pr.html_url,
            status,
            points_awarded: points,
            contributed_at: prDate,
          });

          // Aggregate contributor points
          if (!contributorStats.has(uid)) {
            contributorStats.set(uid, {
              name: authorProf.full_name || authorProf.github || author,
              handle: author,
              points: 0,
              count: 0,
              mergedCount: 0,
              openCount: 0,
              repos: new Set(),
            });
          }
          const st = contributorStats.get(uid);
          st.points += points;
          st.count += 1;
          if (pr.merged_at) st.mergedCount += 1;
          else st.openCount += 1;
          st.repos.add(exactSlug.toLowerCase());
        }

        if (pulls.length < 100) break;
        page++;
      } catch (err) {
        console.error(`Fetch exception for ${exactSlug} page ${page}:`, err.message);
        break;
      }
    }

    if (repoPrsFound > 0) {
      console.log(`  -> Found ${repoPrsFound} active contributor PRs on ${exactSlug}.`);
    }
  }

  console.log(`\n===============================================================`);
  console.log(`Summary: Scanned ${reposScanned} projects.`);
  console.log(`Total verified PR contributions found: ${verifiedContributions.length}`);
  console.log(`Total active contributors scored: ${contributorStats.size}`);
  console.log(`===============================================================`);

  // 4. CRITICAL SAFETY GUARD: Prevent accidental wiping
  if (verifiedContributions.length === 0) {
    console.error("\n❌ SAFETY SHIELD TRIGGERED: 0 verified contributions found. Aborting!");
    process.exit(1);
  }

  // 5. Upsert verified contributions into public.contributions
  console.log(`\nUpserting ${verifiedContributions.length} contributions...`);
  for (let i = 0; i < verifiedContributions.length; i += 50) {
    const chunk = verifiedContributions.slice(i, i + 50);
    const { error: cErr } = await admin.from("contributions").upsert(chunk, { onConflict: "github_url" });
    if (cErr) {
      console.warn(`Chunk ${i} upsert error:`, cErr.message);
    }
  }

  // 6. Reset all profiles to 0 first so unverified test scores don't linger
  console.log("Synchronizing profile scores across database...");
  await admin
    .from("profiles")
    .update({ score: 0, merged_prs: 0, projects_count: 0 })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  // 7. Update profiles for all active contributors with their actual scores
  console.log(`Updating ${contributorStats.size} active contributor profiles...`);
  for (const [userId, stats] of contributorStats.entries()) {
    const { error: pUpErr } = await admin
      .from("profiles")
      .update({
        score: stats.points,
        merged_prs: stats.count,
        projects_count: stats.repos.size,
        github: stats.handle,
      })
      .or(`user_id.eq.${userId},id.eq.${userId}`);

    if (pUpErr) {
      console.warn(`Failed to update profile for ${userId}:`, pUpErr.message);
    } else {
      console.log(`   ✓ ${stats.name} (@${stats.handle}): ${stats.points} pts | ${stats.count} PRs (${stats.mergedCount} merged, ${stats.openCount} open)`);
    }
  }

  // 8. Update public.leaderboard_stats
  const nowIso = new Date().toISOString();
  const leaderboardStats = [];
  for (const [userId, stats] of contributorStats.entries()) {
    leaderboardStats.push({
      user_id: userId,
      total_points: stats.points,
      current_streak: 1,
      updated_at: nowIso,
    });
  }

  for (let i = 0; i < leaderboardStats.length; i += 100) {
    const chunk = leaderboardStats.slice(i, i + 100);
    const { error: lErr } = await admin.from("leaderboard_stats").upsert(chunk, { onConflict: "user_id" });
    if (lErr) {
      console.error(`Error upserting leaderboard_stats chunk ${i}:`, lErr.message);
    }
  }

  console.log("\n=== Leaderboard Sync Completed Successfully ===");
  const { count: finalContribs } = await admin.from("contributions").select("*", { count: "exact", head: true });
  console.log(`Total rows in public.contributions: ${finalContribs}`);
  console.log(`Total active contributors on leaderboard: ${leaderboardStats.length}`);
}

main().catch((err) => {
  console.error("Fatal sync error:", err);
  process.exit(1);
});
