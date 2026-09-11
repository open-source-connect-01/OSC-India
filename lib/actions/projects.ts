"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminSession } from "@/lib/auth/admin-auth";
import { createClient } from "@/lib/supabase/server";

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  githubUrl: string;
  language: string;
  accentColor: string;
  stars?: string;
  forks?: string;
  created_at?: string;
}

export interface NewProjectInput {
  title: string;
  description?: string;
  githubUrl: string;
  language?: string;
  accentColor?: string;
  stars?: string;
  forks?: string;
}

const DEFAULT_PROJECTS: ProjectItem[] = [];

const LOCAL_STORAGE_FILE = path.join(process.cwd(), "data", "custom-projects.json");

function readLocalCustomProjects(): ProjectItem[] {
  try {
    if (fs.existsSync(LOCAL_STORAGE_FILE)) {
      const raw = fs.readFileSync(LOCAL_STORAGE_FILE, "utf-8");
      return JSON.parse(raw) as ProjectItem[];
    }
  } catch (err) {
    console.error("Error reading custom projects file:", err);
  }
  return [];
}

function writeLocalCustomProjects(projects: ProjectItem[]): void {
  try {
    const dir = path.dirname(LOCAL_STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORAGE_FILE, JSON.stringify(projects, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing custom projects file:", err);
  }
}

/**
 * Validates admin permissions for project modifications.
 */
async function checkAdminAuth(): Promise<boolean> {
  const isAdminSession = await verifyAdminSession();
  if (isAdminSession) return true;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role, is_admin")
      .eq("id", user.id)
      .single();

    return Boolean(profile && (profile.is_admin || profile.role === "admin" || profile.role === "project-admin"));
  } catch {
    return false;
  }
}

/**
 * Parses a database row from public.projects into a clean ProjectItem.
 * Extracts title from `name`, repo from `github_repo_url`, and extra metadata from embedded comment or columns.
 */
function parseProjectFromDb(row: any): ProjectItem {
  let cleanDesc = row.description || "";
  let language = "TypeScript";
  let accentColor = "#FF7518";
  let stars = "0";
  let forks = "0";

  if (row.language) language = row.language;
  if (row.accent_color || row.accentColor) accentColor = row.accent_color || row.accentColor;
  if (row.stars) stars = row.stars;
  if (row.forks) forks = row.forks;

  const metaMatch = cleanDesc.match(/<!--meta:(.*?)-->/);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      if (parsed.language) language = parsed.language;
      if (parsed.accentColor) accentColor = parsed.accentColor;
      if (parsed.stars) stars = parsed.stars;
      if (parsed.forks) forks = parsed.forks;
      cleanDesc = cleanDesc.replace(/<!--meta:(.*?)-->/, "").trim();
    } catch {
      // ignore parse error
    }
  }

  return {
    id: String(row.id),
    title: row.name || row.title || "Project",
    description: cleanDesc,
    githubUrl: row.github_repo_url || row.github_url || row.githubUrl || "#",
    language,
    accentColor,
    stars,
    forks,
    created_at: row.created_at,
  };
}

/**
 * Fetches all active projects directly from the Supabase database.
 * When DB is reachable, it is the single source of truth (including an empty list).
 */
export async function getProjects(): Promise<ProjectItem[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("projects")
      .select("*");

    // When the database query succeeds (error is null and data is an array):
    // Even if data is empty ([]), that is the database reality (e.g. all projects were deleted).
    if (!error && Array.isArray(data)) {
      const projects = data.map(parseProjectFromDb);
      // Synchronize local cache to mirror database state exactly
      writeLocalCustomProjects(projects);
      return projects;
    }

    if (error) {
      console.warn("Supabase notice when querying projects table:", error.message);
    }
  } catch (err) {
    console.warn("Notice: reading projects table from Supabase failed:", err);
  }

  // Fallback to local store ONLY if the database connection / network failed
  const localProjects = readLocalCustomProjects();
  if (localProjects.length > 0) {
    return localProjects;
  }

  return [];
}

/**
 * Creates and registers a new project directly in the Supabase database.
 * Only accessible by authenticated administrators.
 */
export async function createProjectAction(
  input: NewProjectInput
): Promise<{ success: boolean; project?: ProjectItem; error?: string }> {
  const isAuthorized = await checkAdminAuth();
  if (!isAuthorized) {
    return { success: false, error: "Unauthorized. Admin credentials required to add projects." };
  }

  if (!input.title || !input.title.trim()) {
    return { success: false, error: "Project title is required." };
  }

  let cleanGithub = (input.githubUrl || "").trim();
  if (cleanGithub && !cleanGithub.startsWith("http://") && !cleanGithub.startsWith("https://")) {
    cleanGithub = `https://github.com/${cleanGithub.replace(/^@/, "")}`;
  }

  const metaPayload = {
    language: (input.language || "TypeScript").trim(),
    accentColor: (input.accentColor || "#FF7518").trim(),
    stars: input.stars?.trim() || "0",
    forks: input.forks?.trim() || "0",
  };

  const userDesc = (input.description || "").trim() || "Community open source project participating in OSC India.";
  const dbDescription = `${userDesc}\n<!--meta:${JSON.stringify(metaPayload)}-->`;

  let createdProject: ProjectItem;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("projects")
      .insert({
        name: input.title.trim(),
        github_repo_url: cleanGithub || "https://github.com/open-source-connect-01",
        description: dbDescription,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to insert project into Supabase DB:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    createdProject = parseProjectFromDb(data);
  } catch (err: any) {
    console.error("Database project creation exception:", err);
    return { success: false, error: err?.message || "Failed to save project to database." };
  }

  // Also sync to local backup
  const currentLocal = readLocalCustomProjects();
  writeLocalCustomProjects([createdProject, ...currentLocal.filter((p) => p.id !== createdProject.id)]);

  revalidatePath("/projects");
  revalidatePath("/admin");

  return { success: true, project: createdProject };
}

/**
 * Permanently deletes a project directly from the Supabase database.
 */
export async function deleteProjectAction(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  const isAuthorized = await checkAdminAuth();
  if (!isAuthorized) {
    return { success: false, error: "Unauthorized. Admin credentials required to delete projects." };
  }

  if (!projectId || !projectId.trim()) {
    return { success: false, error: "Project ID is required." };
  }

  const cleanId = projectId.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

  try {
    const admin = createAdminClient();

    // 1. Clean up associated contributions if any to satisfy foreign key constraints
    if (isUuid) {
      try {
        await admin.from("contributions").delete().eq("project_id", cleanId);
      } catch (e) {
        console.warn("Notice: cleaning linked contributions for project:", e);
      }
    }

    // 2. Permanently delete from Supabase database
    if (isUuid) {
      const { error } = await admin
        .from("projects")
        .delete()
        .eq("id", cleanId);

      if (error) {
        console.error("Failed to delete project from Supabase DB:", error);
        return { success: false, error: `Database error: ${error.message}` };
      }
    } else {
      // If not a UUID, delete by matching repo url or name
      const { error } = await admin
        .from("projects")
        .delete()
        .or(`github_repo_url.eq.${cleanId},name.eq.${cleanId}`);

      if (error) {
        console.error("Failed to delete project by repo/name from DB:", error);
      }
    }
  } catch (err: any) {
    console.error("Database project deletion exception:", err);
    return { success: false, error: err?.message || "Failed to delete project from database." };
  }

  // 3. Keep local backup cache synchronized
  const localCustom = readLocalCustomProjects();
  const filtered = localCustom.filter(
    (p) => p.id !== cleanId && p.githubUrl !== cleanId && p.title.toLowerCase() !== cleanId.toLowerCase()
  );
  writeLocalCustomProjects(filtered);

  revalidatePath("/projects");
  revalidatePath("/admin");

  return { success: true };
}

/**
 * Permanently removes ALL projects from the Supabase database and local store.
 * Strictly restricted to authorized administrators.
 */
export async function deleteAllProjectsAction(): Promise<{ success: boolean; count?: number; error?: string }> {
  const isAuthorized = await checkAdminAuth();
  if (!isAuthorized) {
    return { success: false, error: "Unauthorized. Admin credentials required to delete projects." };
  }

  try {
    const admin = createAdminClient();

    // 1. Clean up linked contributions to prevent foreign key issues
    try {
      await admin.from("contributions").delete().not("project_id", "is", null);
    } catch (e) {
      console.warn("Notice: cleaning linked contributions:", e);
    }

    // 2. Permanently delete all records from projects table in Supabase
    const { data, error } = await admin
      .from("projects")
      .delete()
      .not("id", "is", null)
      .select();

    if (error) {
      console.error("Failed to delete all projects from Supabase DB:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    // 3. Clear local backup cache completely
    writeLocalCustomProjects([]);

    revalidatePath("/projects");
    revalidatePath("/admin");

    return { success: true, count: data ? data.length : 0 };
  } catch (err: any) {
    console.error("Database deleteAllProjectsAction exception:", err);
    return { success: false, error: err?.message || "Failed to delete all projects from database." };
  }
}
