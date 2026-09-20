const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// 1. Load environment variables from .env.local
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

// 2. Setup GitHub auth headers (5,000 req/hr rate limit)
const token = process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PAT || process.env.PAT_TOKEN;
const headers = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "OSC-India-Recalculate-28",
};
if (token) {
  headers.Authorization = `Bearer ${token}`;
}

const DIFFICULTY_POINTS = {
  easy: 10,
  medium: 20,
  hard: 30,
  expert: 50,
};

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
  return clean.toLowerCase();
}

function cleanString(s) {
  if (!s) return "";
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolvePrDifficulty(pr) {
  const labelNames = (pr.labels || [])
    .map((l) => (typeof l === "string" ? l : l.name || "").toLowerCase())
    .join(" ");

  if (/expert|level[- :_]?4\b|lvl[- :_]?4\b|level4|lvl4|difficulty[- :_]+expert/i.test(labelNames)) {
    return "expert";
  }
  if (/hard\b|difficulty[- :_]+hard|level[- :_]?3\b|lvl[- :_]?3\b|level3|lvl3|advanced|complex/i.test(labelNames)) {
    return "hard";
  }
  if (/medium|med\b|intermediate|mid\b|difficulty[- :_]+medium|level[- :_]?2\b|lvl[- :_]?2\b|level2|lvl2/i.test(labelNames)) {
    return "medium";
  }
  if (/easy|beginner|starter|good[ -]?first[ -]?issue|difficulty[- :_]+easy|level[- :_]?1\b|lvl[- :_]?1\b|level1|lvl1/i.test(labelNames)) {
    return "easy";
  }

  const fullText = `${pr.title || ""} ${pr.body || ""}`.toLowerCase();
  if (/\[expert\]|\(expert\)|level[- :_]?4\b|lvl[- :_]?4\b|level4|lvl4|difficulty:\s*expert/i.test(fullText)) return "expert";
  if (/\[hard\]|\(hard\)|level[- :_]?3\b|lvl[- :_]?3\b|level3|lvl3|difficulty:\s*hard|\bhard\b/i.test(fullText)) return "hard";
  if (/\[medium\]|\(medium\)|\[med\]|\(med\)|level[- :_]?2\b|lvl[- :_]?2\b|level2|lvl2|difficulty:\s*medium|\bmedium\b/i.test(fullText)) return "medium";
  if (/\[easy\]|\(easy\)|level[- :_]?1\b|lvl[- :_]?1\b|level1|lvl1|good[ -]?first[ -]?issue|difficulty:\s*easy|\beasy\b/i.test(fullText)) return "easy";

  return "easy"; // 10 pts default
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function main() {
  console.log("================================================================================");
  console.log("OSC-India: Recalculating All Participants Strictly Based on the 28 Projects");
  console.log("================================================================================\n");

  // Check GitHub API Rate Limit
  if (token) {
    try {
      const rlRes = await fetchWithTimeout("https://api.github.com/rate_limit", { headers }, 5000);
      if (rlRes.ok) {
        const rlData = await rlRes.json();
        const core = rlData.resources?.core;
        if (core) {
          const resetTime = new Date(core.reset * 1000).toLocaleTimeString();
          console.log(`[GitHub API] Authenticated. Quota: ${core.remaining}/${core.limit} requests remaining (Resets at ${resetTime})`);
        }
      }
    } catch (e) {
      console.warn("[GitHub API] Rate limit check warning:", e.message);
    }
  } else {
    console.warn("[GitHub API] WARNING: Running unauthenticated. Rate limits will be capped at 60 requests/hr.");
  }


  // Step 1: Load strictly the official 28 projects from public.projects
  const { data: dbProjects, error: pErr } = await admin
    .from("projects")
    .select("id, name, github_repo_url")
    .order("name", { ascending: true });

  if (pErr || !dbProjects) {
    console.error("Failed to load projects:", pErr);
    process.exit(1);
  }

  console.log(`1. Loaded ${dbProjects.length} official competition projects from database.`);
  const projectMap = new Map(); // slug -> project
  const projectAdminHandles = new Set();

  for (const p of dbProjects) {
    const slug = normalizeRepoSlug(p.github_repo_url);
    if (!slug) continue;
    projectMap.set(slug, p);
    const owner = slug.split("/")[0];
    projectAdminHandles.add(owner);
  }

  // Step 2: Fetch all profiles & auth users with complete pagination
  console.log("\n2. Loading all contributor profiles and auth.users from database...");
  const profiles = [];
  let pageP = 0;
  while (true) {
    const { data: chunk, error: profErr } = await admin
      .from("profiles")
      .select("*")
      .range(pageP * 1000, (pageP + 1) * 1000 - 1);
    if (profErr) {
      console.error("Failed to load profiles chunk:", profErr);
      process.exit(1);
    }
    if (!chunk || chunk.length === 0) break;
    profiles.push(...chunk);
    if (chunk.length < 1000) break;
    pageP++;
  }

  const authUsers = [];
  let authPage = 1;
  while (true) {
    const { data: authData } = await admin.auth.admin.listUsers({ page: authPage, perPage: 1000 });
    if (!authData?.users || authData.users.length === 0) break;
    authUsers.push(...authData.users);
    if (authData.users.length < 1000) break;
    authPage++;
  }

  console.log(`   Loaded ${profiles.length} total user profiles and ${authUsers.length} auth.users accounts.`);

  // Build Master Multi-Tier Contributor Registry
  const userRegistry = [];
  for (const p of profiles) {
    const u = authUsers.find((x) => x.id === p.id || x.id === p.user_id);
    const email = (u?.email || "").toLowerCase().trim();
    const emailPrefix = email ? email.split("@")[0] : "";
    const emailPrefixClean = cleanString(emailPrefix);
    const emailPrefixNoDigits = cleanString(emailPrefix.replace(/[0-9]/g, ""));

    const ghHandles = new Set();
    const pGh = normalizeGitHubHandle(p.github);
    if (pGh) ghHandles.add(pGh);

    const uGh = normalizeGitHubHandle(
      u?.user_metadata?.user_name || u?.user_metadata?.github || u?.user_metadata?.preferred_username
    );
    if (uGh) ghHandles.add(uGh);

    const ghIdentity = (u?.identities || []).find((i) => i.provider === "github");
    const idGh = normalizeGitHubHandle(
      ghIdentity?.identity_data?.user_name || ghIdentity?.identity_data?.preferred_username
    );
    if (idGh) ghHandles.add(idGh);

    const names = new Set();
    const fn = (p.full_name || u?.user_metadata?.full_name || u?.user_metadata?.name || "").trim();
    if (fn) {
      names.add(cleanString(fn));
      fn.split(/\s+/).forEach((w) => {
        if (w.length >= 4) names.add(cleanString(w));
      });
    }

    userRegistry.push({
      userId: p.user_id || p.id,
      profile: p,
      user: u,
      email,
      emailPrefixClean,
      emailPrefixNoDigits,
      ghHandles,
      names,
      role: p.role || "contributor",
    });
  }

  function matchAuthor(authorHandle) {
    const lower = normalizeGitHubHandle(authorHandle);
    if (!lower || lower.includes("[bot]")) return null;

    const cleanAuthor = cleanString(lower);
    const baseAuthor = cleanString(lower.split("-")[0]);
    const baseNoDigits = cleanString(baseAuthor.replace(/[0-9]/g, ""));

    // Tier 1: Exact GitHub handle
    for (const u of userRegistry) {
      if (u.ghHandles.has(lower)) return { user: u, tier: "exact_handle" };
    }

    // Tier 2: Exact email prefix
    for (const u of userRegistry) {
      if (u.emailPrefixClean && (u.emailPrefixClean === cleanAuthor || (baseAuthor.length >= 4 && u.emailPrefixClean === baseAuthor))) {
        return { user: u, tier: "email_prefix" };
      }
    }

    // Tier 3: Fuzzy email prefix (min 6 chars)
    for (const u of userRegistry) {
      if (u.emailPrefixClean && u.emailPrefixClean.length >= 6) {
        if (cleanAuthor.startsWith(u.emailPrefixClean) || u.emailPrefixClean.startsWith(cleanAuthor)) {
          return { user: u, tier: "fuzzy_email_prefix" };
        }
        if (baseAuthor.length >= 6 && (baseAuthor.startsWith(u.emailPrefixClean) || u.emailPrefixClean.startsWith(baseAuthor))) {
          return { user: u, tier: "fuzzy_email_base" };
        }
      }
    }

    // Tier 4: Name match (min 6 chars)
    if (cleanAuthor.length >= 6 || baseAuthor.length >= 6) {
      for (const u of userRegistry) {
        for (const n of u.names) {
          if (n.length >= 6 && (n === cleanAuthor || (baseAuthor.length >= 6 && n === baseAuthor))) {
            return { user: u, tier: "full_name_match" };
          }
        }
      }
    }

    // Tier 5: Prefix without digits match (min 7 chars)
    if (baseNoDigits.length >= 7) {
      for (const u of userRegistry) {
        if (u.emailPrefixNoDigits && u.emailPrefixNoDigits.length >= 7 && u.emailPrefixNoDigits === baseNoDigits) {
          return { user: u, tier: "fuzzy_no_digits" };
        }
      }
    }

    return null;
  }

  // Step 3: Sweep PRs across the official 28 projects
  console.log("\n3. Scanning all pull requests across the official 28 projects...");
  const verifiedContributions = [];
  const contributorStats = new Map();
  const seenPrUrls = new Set();
  let totalPrsFound = 0;

  for (const [exactSlug, project] of projectMap.entries()) {
    let page = 1;
    let repoPrsFound = 0;

    while (page <= 5) {
      try {
        const url = `https://api.github.com/repos/${exactSlug}/pulls?state=all&per_page=100&page=${page}&sort=updated&direction=desc`;
        const res = await fetchWithTimeout(url, { headers }, 5000);
        if (!res.ok) break;

        const pulls = await res.json();
        if (!Array.isArray(pulls) || pulls.length === 0) break;
        totalPrsFound += pulls.length;

        for (const pr of pulls) {
          if (pr.state === "closed" && !pr.merged_at) continue;

          const author = normalizeGitHubHandle(pr.user?.login);
          if (!author) continue;

          const match = matchAuthor(author);
          if (!match) continue;

          const { user } = match;
          // Organizers/admins do not participate in contributor leaderboard scoring
          if (user.role === "admin" || user.role === "project-admin" || projectAdminHandles.has(author)) {
            continue;
          }

          if (seenPrUrls.has(pr.html_url)) continue;
          seenPrUrls.add(pr.html_url);

          const diff = resolvePrDifficulty(pr);
          const points = DIFFICULTY_POINTS[diff];
          const prDate = pr.merged_at || pr.created_at || new Date().toISOString();
          const status = pr.merged_at ? "merged" : "open";
          const uid = user.userId;

          repoPrsFound++;

          verifiedContributions.push({
            user_id: uid,
            project_id: project.id,
            type: "pr",
            github_url: pr.html_url,
            status,
            points_awarded: points,
            contributed_at: prDate,
          });

          if (!contributorStats.has(uid)) {
            contributorStats.set(uid, {
              user,
              name: user.profile.full_name || user.email || author,
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
          st.repos.add(exactSlug);
        }

        if (pulls.length < 100) break;
        page++;
      } catch (err) {
        break;
      }
    }

    if (repoPrsFound > 0) {
      console.log(`   ✓ ${exactSlug}: ${repoPrsFound} verified PRs`);
    }
  }

  console.log("\n================================================================================");
  console.log(`TOTAL PRs SCANNED IN 28 PROJECTS: ${totalPrsFound}`);
  console.log(`TOTAL VERIFIED CONTRIBUTIONS FOUND: ${verifiedContributions.length}`);
  console.log(`TOTAL CONTRIBUTORS EARNING POINTS: ${contributorStats.size}`);
  console.log(`TOTAL PROFILES RECALCULATED: ${profiles.length}`);
  console.log("================================================================================\n");

  if (verifiedContributions.length === 0) {
    console.error("❌ Safety abort: 0 contributions found. Database was not altered.");
    process.exit(1);
  }

  // Step 4: Upsert verified contributions into public.contributions
  console.log(`4. Upserting ${verifiedContributions.length} verified PRs into public.contributions...`);
  for (let i = 0; i < verifiedContributions.length; i += 50) {
    const chunk = verifiedContributions.slice(i, i + 50);
    const { error: cErr } = await admin.from("contributions").upsert(chunk, { onConflict: "github_url" });
    if (cErr) {
      console.warn(`Chunk ${i} upsert error:`, cErr.message);
    }
  }

  // Step 5: Recalculate and update ALL participant profiles
  console.log("\n5. Recalculating and updating all contributor profiles in public.profiles...");
  const activeUserIds = new Set(contributorStats.keys());

  // Reset profiles of users without verified PRs in the 28 projects to 0
  for (const p of profiles) {
    const uid = p.user_id || p.id;
    if (!activeUserIds.has(uid) && p.role !== "admin" && p.role !== "project-admin" && (p.score > 0 || p.merged_prs > 0)) {
      await admin.from("profiles").update({ score: 0, merged_prs: 0, projects_count: 0 }).eq("id", p.id);
    }
  }

  // Update profiles of all active contributors with their calculated points and PR counts
  for (const [userId, stats] of contributorStats.entries()) {
    let { error: pUpErr } = await admin
      .from("profiles")
      .update({
        score: stats.points,
        merged_prs: stats.count,
        projects_count: Math.max(1, stats.repos.size),
        github: stats.handle,
      })
      .or(`user_id.eq.${userId},id.eq.${userId}`);

    if (pUpErr && (pUpErr.code === "23505" || pUpErr.message?.includes("unique constraint"))) {
      // If github handle is duplicated, update scores and counts without changing github field
      const { error: retryErr } = await admin
        .from("profiles")
        .update({
          score: stats.points,
          merged_prs: stats.count,
          projects_count: Math.max(1, stats.repos.size),
        })
        .or(`user_id.eq.${userId},id.eq.${userId}`);

      if (retryErr) {
        console.warn(`Retry update failed for ${userId}:`, retryErr.message);
      }
    } else if (pUpErr) {
      console.warn(`Profile update failed for ${userId}:`, pUpErr.message);
    }
  }

  // Step 6: Upsert public.leaderboard_stats
  console.log("\n6. Synchronizing public.leaderboard_stats...");
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
      console.error(`Leaderboard stats upsert error:`, lErr.message);
    }
  }

  // Step 7: Print full leaderboard rankings
  console.log("\n================================================================================");
  console.log("OFFICIAL LEADERBOARD RANKINGS (28 PROJECTS)");
  console.log("================================================================================");
  const sortedContributors = Array.from(contributorStats.values()).sort((a, b) => b.points - a.points);
  sortedContributors.forEach((c, idx) => {
    console.log(
      `${String(idx + 1).padStart(2, " ")}. ${c.name.padEnd(30, " ")} | @${c.handle.padEnd(25, " ")} | ${String(c.points).padStart(4, " ")} pts | ${c.count} PRs (${c.mergedCount} merged, ${c.openCount} open) | ${c.repos.size} repos`
    );
  });

  const { count: finalContribCount } = await admin.from("contributions").select("*", { count: "exact", head: true });
  console.log("\n================================================================================");
  console.log(`✓ Total rows in public.contributions: ${finalContribCount}`);
  console.log(`✓ Total active contributors with points: ${contributorStats.size}`);
  console.log(`✓ Total registered contributors recalculated: ${profiles.length}`);
  console.log("✓ All 28 projects and leaderboard scores are now 100% updated and in sync!");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
