const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const fs = require("fs");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseKey);

const scratchPath = "/Users/sayanghosh/.gemini/antigravity/brain/c734a293-570d-4c23-9705-8c4dcaf8a074/scratch/prepare-projects.js";
let projectsToAdd = [];
if (fs.existsSync(scratchPath)) {
  projectsToAdd = require(scratchPath).projectsToAdd;
} else {
  console.error("scratch prepare-projects.js not found at " + scratchPath);
  process.exit(1);
}

async function sync() {
  console.log(`Checking existing projects in Supabase...`);
  const { data: existing, error: err1 } = await admin.from("projects").select("id, name, github_repo_url");
  if (err1) {
    console.error("Error reading from Supabase:", err1);
    process.exit(1);
  }
  console.log(`Currently ${existing.length} projects in Supabase.`);

  const existingUrls = new Set();
  const existingNames = new Set();
  for (const row of existing) {
    const url = (row.github_repo_url || "").toLowerCase().replace(/\/+$/, "");
    if (url) existingUrls.add(url);
    if (row.name) existingNames.add(row.name.toLowerCase().trim());
  }

  const toInsert = [];
  for (const p of projectsToAdd) {
    const normUrl = (p.repoUrl || "").toLowerCase().replace(/\/+$/, "");
    const normName = p.title.toLowerCase().trim();
    if (existingUrls.has(normUrl) || existingNames.has(normName)) {
      console.log(`Skipping already present in DB: ${p.title}`);
      continue;
    }

    const metaPayload = {
      language: p.language,
      accentColor: p.accentColor,
      stars: "0",
      forks: "0",
      openIssues: "0",
      unassignedIssues: "0"
    };
    const dbDescription = `${p.description.trim()}\n<!--meta:${JSON.stringify(metaPayload)}-->`;

    toInsert.push({
      id: p.id,
      name: p.title,
      github_repo_url: p.repoUrl,
      description: dbDescription
    });
  }

  if (toInsert.length === 0) {
    console.log("No new projects need insertion.");
  } else {
    console.log(`Inserting ${toInsert.length} new projects into Supabase...`);
    const { data: inserted, error: insertErr } = await admin.from("projects").upsert(toInsert, { onConflict: "id" }).select();
    if (insertErr) {
      console.error("Error inserting projects into Supabase:", insertErr);
      process.exit(1);
    }
    console.log(`Successfully inserted ${inserted.length} projects into Supabase!`);
  }

  const { data: allProjects, error: errFinal } = await admin.from("projects").select("id, name");
  if (!errFinal) {
    console.log(`Total projects in Supabase now: ${allProjects.length}`);
  }
}

sync();
