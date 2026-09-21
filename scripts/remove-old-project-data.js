const fs = require("fs");
const path = require("path");
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseKey);

// 29 Official Competition Repositories (lowercase slugs)
const OFFICIAL_SLUGS = new Set([
  "kanishjebamathewm/truxify",
  "aditthyass/iloveagents",
  "l3tchupkt/adaptq",
  "adityapainuli/clippings-vids",
  "canopus-labs/preppilot",
  "aseemprasad/air-quality-intelligence",
  "gauravkarakoti/secureflow",
  "logeshv586-code/aiproductfactory",
  "harshalkurrey/harshal-world",
  "vishnukothakapu/linkid",
  "aharshi3614/devwhisper",
  "harsh-vardhan09/athlead",
  "satyampandey-07/worksphere",
  "jyatin/kiranawala",
  "10-mohan/trafitech",
  "aashutoshkumarbhardwaj/creatoros",
  "harshbansal8705/desktopai",
  "jugaadlang/jugaadlang",
  "srigadaakshaykumar/stock",
  "iixii-l192/pocketops-app",
  "soumyamishra-7/walletwise",
  "ytxfsgamerz/winaurex",
  "anthropicbots/hiero-bot-py",
  "pratyushjha06/dockfleet",
  "sandesh13fr/tcalc",
  "advanceddiscordbot/advanced-discord-bot",
  "elixpo/blogs.elixpo",
  "janani-bn/civicfix",
  "devsidd2006/openhire",
]);

function extractSlug(url) {
  if (!url) return "";
  const m = url.match(/github\.com\/([^\/]+\/[^\/]+)/i);
  return m ? m[1].toLowerCase() : "";
}

async function runCleanup() {
  console.log("================================================================================");
  console.log("OSC-India: Removing Old Decommissioned Project Data from Supabase");
  console.log("================================================================================\n");

  // Step 1: Fetch all contributions
  console.log("1. Fetching all records from public.contributions...");
  const { data: allContribs, error: fetchErr } = await admin
    .from("contributions")
    .select("id, github_url, project_id, user_id, points_awarded, status");

  if (fetchErr) {
    console.error("Error fetching contributions:", fetchErr);
    process.exit(1);
  }

  console.log(`   Found ${allContribs.length} total contributions in database.`);

  const validContribs = [];
  const toDelete = [];
  const toDeleteBySlug = {};

  for (const c of allContribs) {
    const slug = extractSlug(c.github_url);
    if (OFFICIAL_SLUGS.has(slug)) {
      validContribs.push(c);
    } else {
      toDelete.push(c);
      toDeleteBySlug[slug || "unknown"] = (toDeleteBySlug[slug || "unknown"] || 0) + 1;
    }
  }

  console.log(`   - Valid official contributions: ${validContribs.length}`);
  console.log(`   - Legacy contributions to remove: ${toDelete.length}`);
  console.log("   - Breakdown of legacy contributions by repository:", toDeleteBySlug);

  if (toDelete.length === 0) {
    console.log("\nNo legacy contributions found. Database is already clean!");
  } else {
    // Step 2: Delete legacy contributions in chunks
    console.log(`\n2. Deleting ${toDelete.length} legacy contributions...`);
    const idsToDelete = toDelete.map((c) => c.id);
    const chunkSize = 100;
    for (let i = 0; i < idsToDelete.length; i += chunkSize) {
      const chunk = idsToDelete.slice(i, i + chunkSize);
      const { error: delErr } = await admin.from("contributions").delete().in("id", chunk);
      if (delErr) {
        console.error(`Error deleting chunk starting at index ${i}:`, delErr);
        process.exit(1);
      }
    }
    console.log(`   ✓ Successfully deleted ${toDelete.length} legacy contribution records.`);
  }

  // Step 3: Recalculate contributor profiles and leaderboard
  console.log("\n3. Recalculating contributor statistics strictly from valid contributions...");
  const userStats = new Map(); // userId -> { points, mergedCount, repos: Set, projectIds: Set }

  for (const c of validContribs) {
    const uid = c.user_id;
    if (!uid) continue;
    if (!userStats.has(uid)) {
      userStats.set(uid, {
        points: 0,
        mergedCount: 0,
        repos: new Set(),
        projectIds: new Set(),
      });
    }
    const st = userStats.get(uid);
    st.points += Number(c.points_awarded || 0);
    if (c.status === "merged") {
      st.mergedCount += 1;
    }
    const slug = extractSlug(c.github_url);
    if (slug) st.repos.add(slug);
    if (c.project_id) st.projectIds.add(c.project_id);
  }

  // Step 4: Fetch all profiles to update
  console.log("\n4. Synchronizing public.profiles table...");
  const { data: allProfiles, error: profErr } = await admin
    .from("profiles")
    .select("id, user_id, score, merged_prs, projects_count, role");

  if (profErr) {
    console.error("Error fetching profiles:", profErr);
    process.exit(1);
  }

  let updatedProfiles = 0;
  let resetProfiles = 0;

  for (const p of allProfiles) {
    const uid = p.user_id || p.id;
    const stats = userStats.get(uid);

    if (stats) {
      const newScore = stats.points;
      const newMerged = stats.mergedCount;
      const newProjCount = Math.max(1, stats.repos.size);

      if (p.score !== newScore || p.merged_prs !== newMerged || p.projects_count !== newProjCount) {
        await admin
          .from("profiles")
          .update({
            score: newScore,
            merged_prs: newMerged,
            projects_count: newProjCount,
          })
          .eq("id", p.id);
        updatedProfiles++;
      }
    } else {
      // User has no valid contributions in official competition projects
      if ((p.score > 0 || p.merged_prs > 0 || p.projects_count > 0) && p.role !== "admin") {
        await admin
          .from("profiles")
          .update({
            score: 0,
            merged_prs: 0,
            projects_count: 0,
          })
          .eq("id", p.id);
        resetProfiles++;
      }
    }
  }

  console.log(`   ✓ Updated ${updatedProfiles} active contributor profiles with accurate scores.`);
  console.log(`   ✓ Reset ${resetProfiles} profiles that had points only from deleted projects.`);

  // Step 5: Update public.leaderboard_stats
  console.log("\n5. Synchronizing public.leaderboard_stats table...");
  const nowIso = new Date().toISOString();
  const lbRows = [];

  for (const p of allProfiles) {
    const uid = p.user_id || p.id;
    const stats = userStats.get(uid);
    lbRows.push({
      user_id: uid,
      total_points: stats ? stats.points : 0,
      current_streak: stats && stats.points > 0 ? 1 : 0,
      updated_at: nowIso,
    });
  }

  for (let i = 0; i < lbRows.length; i += 100) {
    const chunk = lbRows.slice(i, i + 100);
    const { error: lbErr } = await admin.from("leaderboard_stats").upsert(chunk, { onConflict: "user_id" });
    if (lbErr) {
      console.warn(`Error updating leaderboard_stats chunk ${i}:`, lbErr.message);
    }
  }
  console.log(`   ✓ Updated leaderboard_stats for ${lbRows.length} users.`);

  // Step 6: Final Verification
  const { count: finalContribCount } = await admin
    .from("contributions")
    .select("*", { count: "exact", head: true });

  const { data: finalDbProjects } = await admin
    .from("projects")
    .select("id, name, github_repo_url");

  console.log("\n================================================================================");
  console.log("DATABASE CLEANUP COMPLETED SUCCESSFULLY");
  console.log("================================================================================");
  console.log(`✓ Total projects in public.projects: ${finalDbProjects.length} (Strictly official)`);
  console.log(`✓ Total remaining contributions: ${finalContribCount} (Strictly official)`);
  console.log(`✓ Active contributors with points: ${userStats.size}`);
  console.log("================================================================================\n");
}

runCleanup().catch((err) => {
  console.error("Fatal error in cleanup script:", err);
  process.exit(1);
});
