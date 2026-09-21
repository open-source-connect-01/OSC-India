const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { curatedProjects } = require("./curated-29-data.js");

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

async function sync() {
  console.log("Synchronizing curated 29 projects to Supabase public.projects table...\n");

  const toUpsert = curatedProjects.map(p => {
    const metaPayload = {
      language: p.language,
      accentColor: p.accentColor,
      stars: p.stars,
      forks: p.forks,
      openIssues: p.openIssues,
      unassignedIssues: p.unassignedIssues,
    };
    const dbDescription = `${p.description.trim()}\n<!--meta:${JSON.stringify(metaPayload)}-->`;

    return {
      id: p.id,
      name: p.title,
      github_repo_url: p.githubUrl,
      description: dbDescription,
    };
  });

  const { data: upserted, error: upsertErr } = await admin
    .from("projects")
    .upsert(toUpsert, { onConflict: "id" })
    .select();

  if (upsertErr) {
    console.error("Error upserting projects to Supabase:", upsertErr);
    process.exit(1);
  }

  console.log(`Successfully upserted ${upserted.length} projects.`);

  // Verify any extraneous projects not in the 29 list
  const validIds = new Set(curatedProjects.map(p => p.id));
  const { data: allProjects, error: fetchErr } = await admin.from("projects").select("id, name, github_repo_url");
  if (fetchErr) {
    console.error("Error fetching all projects:", fetchErr);
    process.exit(1);
  }

  const extraneous = allProjects.filter(p => !validIds.has(p.id));
  if (extraneous.length > 0) {
    console.log(`Found ${extraneous.length} extraneous projects to remove:`, extraneous.map(e => e.name));
    for (const extra of extraneous) {
      const { error: delErr } = await admin.from("projects").delete().eq("id", extra.id);
      if (delErr) {
        console.warn(`Could not delete extraneous project ${extra.name}:`, delErr.message);
      } else {
        console.log(`Removed extraneous project: ${extra.name}`);
      }
    }
  }

  // Final verification
  const { data: finalProjects, error: finalErr } = await admin.from("projects").select("id, name, github_repo_url");
  if (finalErr) {
    console.error("Error checking final count:", finalErr);
    process.exit(1);
  }

  console.log(`\n========================================`);
  console.log(`TOTAL PROJECTS IN DATABASE NOW: ${finalProjects.length}`);
  console.log(`========================================`);
  finalProjects.forEach((p, idx) => {
    console.log(`${idx + 1}. [${p.id}] ${p.name} -> ${p.github_repo_url}`);
  });
}

sync();
