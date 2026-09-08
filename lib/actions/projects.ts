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
 * Fetches all active community projects.
 * Combines database entries, local custom additions, and default projects.
 */
export async function getProjects(): Promise<ProjectItem[]> {
  const localCustom = readLocalCustomProjects();
  let dbProjects: ProjectItem[] = [];

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      dbProjects = data.map((d: any) => ({
        id: String(d.id),
        title: d.title,
        description: d.description || "",
        githubUrl: d.github_url || d.githubUrl || "#",
        language: d.language || "TypeScript",
        accentColor: d.accent_color || d.accentColor || "#FF7518",
        stars: d.stars || "0",
        forks: d.forks || "0",
        created_at: d.created_at,
      }));
    }
  } catch (err) {
    // Supabase query fallback (e.g. table not yet migrated or offline)
  }

  // Combine projects, prioritizing DB & local custom projects over defaults
  const seenUrls = new Set<string>();
  const combined: ProjectItem[] = [];

  // 1. First include database projects
  for (const p of dbProjects) {
    const key = (p.githubUrl || p.title).toLowerCase();
    if (!seenUrls.has(key)) {
      seenUrls.add(key);
      combined.push(p);
    }
  }

  // 2. Next include local custom projects
  for (const p of localCustom) {
    const key = (p.githubUrl || p.title).toLowerCase();
    if (!seenUrls.has(key)) {
      seenUrls.add(key);
      combined.push(p);
    }
  }

  // 3. Finally fill with default platform projects
  for (const p of DEFAULT_PROJECTS) {
    const key = (p.githubUrl || p.title).toLowerCase();
    if (!seenUrls.has(key)) {
      seenUrls.add(key);
      combined.push(p);
    }
  }

  return combined;
}

/**
 * Creates and registers a new project.
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

  const newProject: ProjectItem = {
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: input.title.trim(),
    description: (input.description || "").trim() || "Community open source project participating in OSC India.",
    githubUrl: cleanGithub || "https://github.com/open-source-connect-01",
    language: (input.language || "TypeScript").trim(),
    accentColor: (input.accentColor || "#FF7518").trim(),
    stars: input.stars?.trim() || "0",
    forks: input.forks?.trim() || "0",
    created_at: new Date().toISOString(),
  };

  // 1. Persist to local store
  const localCustom = readLocalCustomProjects();
  const updatedLocal = [newProject, ...localCustom.filter((p) => p.githubUrl !== newProject.githubUrl)];
  writeLocalCustomProjects(updatedLocal);

  // 2. Try persisting to Supabase projects table
  try {
    const admin = createAdminClient();
    await admin.from("projects").insert({
      title: newProject.title,
      description: newProject.description,
      github_url: newProject.githubUrl,
      language: newProject.language,
      accent_color: newProject.accentColor,
      stars: newProject.stars,
      forks: newProject.forks,
    });
  } catch (err) {
    // Graceful fallback to local persistence if table not yet migrated
    console.warn("Could not insert into Supabase projects table, relying on local store:", err);
  }

  revalidatePath("/projects");
  revalidatePath("/admin");

  return { success: true, project: newProject };
}

/**
 * Deletes a project from active tracking and display.
 */
export async function deleteProjectAction(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  const isAuthorized = await checkAdminAuth();
  if (!isAuthorized) {
    return { success: false, error: "Unauthorized. Admin credentials required to delete projects." };
  }

  // 1. Remove from local store
  const localCustom = readLocalCustomProjects();
  const filtered = localCustom.filter((p) => p.id !== projectId);
  writeLocalCustomProjects(filtered);

  // 2. Remove from Supabase
  try {
    const admin = createAdminClient();
    await admin.from("projects").delete().eq("id", projectId);
  } catch (err) {
    console.warn("Could not delete from Supabase projects table:", err);
  }

  revalidatePath("/projects");
  revalidatePath("/admin");

  return { success: true };
}
