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

const DEFAULT_PROJECTS: ProjectItem[] = [
  {
    id: "default-osc-india",
    title: "OSC-India Platform",
    description: "Official web platform and dashboard for Open Source Connect India community.",
    githubUrl: "https://github.com/open-source-connect-01/OSC-India",
    language: "TypeScript",
    accentColor: "#FF7518",
    stars: "1.2k",
    forks: "340",
  },
  {
    id: "default-cloudnative",
    title: "CloudNative Orchestrator",
    description: "A modern container orchestration platform built for scalability and performance.",
    githubUrl: "https://github.com/OSC-India/cloudnative-orchestrator",
    language: "Go",
    accentColor: "#22d3ee",
    stars: "12.5k",
    forks: "2.3k",
  },
  {
    id: "default-dataflow",
    title: "DataFlow Pipeline",
    description: "Real-time data processing framework with distributed architecture.",
    githubUrl: "https://github.com/OSC-India/dataflow-pipeline",
    language: "Python",
    accentColor: "#34d399",
    stars: "8.9k",
    forks: "1.5k",
  },
  {
    id: "default-reactui",
    title: "ReactUI Components",
    description: "Comprehensive component library with accessibility-first design.",
    githubUrl: "https://github.com/OSC-India/reactui-components",
    language: "TypeScript",
    accentColor: "#f472b6",
    stars: "15.2k",
    forks: "3.1k",
  },
  {
    id: "default-ml-vision",
    title: "ML Vision Toolkit",
    description: "Computer vision library powered by cutting-edge machine learning models.",
    githubUrl: "https://github.com/OSC-India/ml-vision-toolkit",
    language: "Python",
    accentColor: "#ef4444",
    stars: "9.8k",
    forks: "1.9k",
  },
  {
    id: "default-secureauth",
    title: "SecureAuth Framework",
    description: "Enterprise-grade authentication and authorization solution.",
    githubUrl: "https://github.com/OSC-India/secureauth-framework",
    language: "Rust",
    accentColor: "#3b82f6",
    stars: "6.7k",
    forks: "987",
  },
  {
    id: "default-devops",
    title: "DevOps Automation",
    description: "Complete CI/CD automation suite for modern development workflows.",
    githubUrl: "https://github.com/OSC-India/devops-automation",
    language: "JavaScript",
    accentColor: "#f97316",
    stars: "11.3k",
    forks: "2.4k",
  },
];

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
 * When DB is reachable, it is the single source of truth.
 */
export async function getProjects(): Promise<ProjectItem[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("projects")
      .select("*");

    if (!error && data && data.length > 0) {
      const projects = data.map(parseProjectFromDb);
      // Sync local backup store
      writeLocalCustomProjects(projects);
      return projects;
    }
  } catch (err) {
    console.warn("Notice: reading projects table from Supabase:", err);
  }

  // Fallback to local store only if database query failed (e.g. offline sandbox)
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
 * Deletes a project directly from the Supabase database.
 */
export async function deleteProjectAction(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  const isAuthorized = await checkAdminAuth();
  if (!isAuthorized) {
    return { success: false, error: "Unauthorized. Admin credentials required to delete projects." };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      console.error("Failed to delete project from Supabase DB:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }
  } catch (err: any) {
    console.error("Database project deletion exception:", err);
    return { success: false, error: err?.message || "Failed to delete project from database." };
  }

  // Also sync local backup
  const localCustom = readLocalCustomProjects();
  const filtered = localCustom.filter((p) => p.id !== projectId);
  writeLocalCustomProjects(filtered);

  revalidatePath("/projects");
  revalidatePath("/admin");

  return { success: true };
}
