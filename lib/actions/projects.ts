"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminSession } from "@/lib/auth/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { extractRepoSlug, OFFICIAL_COMPETITION_REPO_SLUGS, getGitHubAuthHeaders } from "@/lib/utils/github-helpers";

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  githubUrl: string;
  language: string;
  accentColor: string;
  stars?: string;
  forks?: string;
  openIssues?: string;
  unassignedIssues?: string;
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
    id: "823673b1-14f7-4de1-8944-836dd8486a17",
    title: "Nari shield",
    description: "NariShield is an AI-powered women safety solution designed to provide quick assistance during unsafe situations through SOS alerts, emergency contact notifications, location sharing, and intelligent safety assistance.",
    githubUrl: "https://github.com/parvathishetty405-max/Nari-shield",
    language: "Python",
    accentColor: "#ec4899",
    stars: "0",
    forks: "0",
  },
  {
    id: "ce0a4ddd-a220-4f05-bf3a-24b949761c40",
    title: "Customer Segmentation and Churn Prediction",
    description: "Delivers an end-to-end Machine Learning and Predictive Analytics pipeline designed to uncover hidden behavioral patterns and proactively identify customer churn risks using K-Means clustering and Random Forest classification.",
    githubUrl: "https://github.com/abhaycs24/CBSOT_SIP_PROJECT-1-",
    language: "Python",
    accentColor: "#a855f7",
    stars: "0",
    forks: "0",
  },
  {
    id: "6248bf04-686e-43cf-a1bc-30823de25cc9",
    title: "Smart Prompt – AI-Powered Prompt Enhancement Chrome Extension",
    description: "An AI-powered Chrome Extension that enhances user prompts before they are submitted to AI platforms like ChatGPT, Claude, and Gemini with intelligent optimization, persona-based engineering, and cross-platform synchronization.",
    githubUrl: "https://github.com/AKASH290802/smart_prompt_extn",
    language: "JavaScript",
    accentColor: "#f59e0b",
    stars: "0",
    forks: "0",
  },
  {
    id: "2c9c9117-4df5-4758-b970-efa0d7ac86c4",
    title: "NetShield Network Monitoring",
    description: "A network monitoring and security operations dashboard providing real-time packet/traffic analytics, alerting, and JWT-authenticated session monitoring.",
    githubUrl: "https://github.com/TanishqMahadik/NETGUARD",
    language: "Python",
    accentColor: "#06b6d4",
    stars: "0",
    forks: "0",
  },
  {
    id: "5d374d0a-94ce-4363-94c4-be597fd9f4f0",
    title: "HALO",
    description: "HALO makes connectivity adaptive, intelligent, and privacy-focused combining decentralized networks, eSIMs, and VPN technologies.",
    githubUrl: "https://github.com/TanmayJaiswal28/halo-v1-app",
    language: "TypeScript",
    accentColor: "#8b5cf6",
    stars: "0",
    forks: "0",
  },
  {
    id: "4dd1a235-7af8-4db5-99f9-8555fbf30457",
    title: "LifeOS-AI",
    description: "An intelligent agent system that proactively queries users about pending schedule tasks, reminders, and daily commitments rather than requiring manual calendar scheduling.",
    githubUrl: "https://github.com/ANU5565/LifeOS-AI",
    language: "Python",
    accentColor: "#10b981",
    stars: "0",
    forks: "0",
  },
  {
    id: "585baad7-e2ca-46aa-bc1d-12d1040abb9e",
    title: "Eco vision",
    description: "An AI-based environmental monitoring project that uses computer vision and data analysis to identify waste, monitor environmental conditions, and promote smart waste management.",
    githubUrl: "https://github.com/Sushmitha-2007/Eco-vision",
    language: "Python",
    accentColor: "#22c55e",
    stars: "0",
    forks: "0",
  },
  {
    id: "bbd4b878-1802-46cf-81a0-6bc098e118a4",
    title: "DevMomentum",
    description: "A data-driven placement-preparation planner that helps users organize daily tasks, track progress, manage study roadmaps, and monitor XP levels, streaks, and analytics.",
    githubUrl: "https://github.com/revatikadam0607/DevMomentum",
    language: "JavaScript",
    accentColor: "#3b82f6",
    stars: "0",
    forks: "0",
  },
  {
    id: "86052217-73a6-4f0a-80b1-3288fd3e4388",
    title: "LawSaathi-RAG",
    description: "Benchmarks different Retrieval-Augmented Generation (RAG) architectures for Indian legal question-answering, evaluating hybrid search methods with published research and reproducible code.",
    githubUrl: "https://github.com/SidakSethi-Singh/LawSathi-Rag",
    language: "Python",
    accentColor: "#eab308",
    stars: "0",
    forks: "0",
  },
  {
    id: "b43b290e-ed2a-4d3d-9b28-0bf7d196177b",
    title: "FinAssist-AI",
    description: "An intelligent conversational financial assistant and fraud detection chatbot built on top of Google Gemini AI and MERN stack.",
    githubUrl: "https://github.com/kaushik6715/Team-Alpha",
    language: "JavaScript",
    accentColor: "#10b981",
    stars: "0",
    forks: "0",
  },
  {
    id: "cf66728e-67dd-444d-9536-bf05ccf8e581",
    title: "JARVIS",
    description: "A desktop-based mini autonomous agent system designed to execute automated computer actions and desktop assistance.",
    githubUrl: "https://github.com/RootDeveloperDS/J.A.R.V.I.S.",
    language: "Python",
    accentColor: "#0284c7",
    stars: "0",
    forks: "0",
  },
  {
    id: "a7ccbff8-f3fd-4a07-a9d4-fba5a667490d",
    title: "Bank interest calculation system",
    description: "A foundational software project simulating core banking calculations, loan computations, and interest rate distribution logic.",
    githubUrl: "https://github.com/onitshubham14/C-Practicle",
    language: "C",
    accentColor: "#64748b",
    stars: "0",
    forks: "0",
  },
  {
    id: "f180dd00-fb06-43b0-bbb5-815d88dd2b8a",
    title: "Ecommerce -website",
    description: "An end-to-end full-stack e-commerce application featuring JWT authentication, category browsing, cart checkout flows under four steps, and Razorpay payment gateway integration.",
    githubUrl: "https://github.com/MANIDEEP738/ecommerce-drf-react",
    language: "Python",
    accentColor: "#f97316",
    stars: "0",
    forks: "0",
  },
  {
    id: "7b8854e9-adbb-498e-b2ee-1855f0409275",
    title: "Jaldiwale",
    description: "An on-demand home and local services marketplace web application modeled after Urban Company / Urban Clap.",
    githubUrl: "https://github.com/Sameer005Y/servicewale-backend",
    language: "JavaScript",
    accentColor: "#eab308",
    stars: "0",
    forks: "0",
  },
  {
    id: "d3f9d1b4-733b-4645-9059-120697002716",
    title: "Agni AI",
    description: "An interactive 3D architectural visualization and interior design platform that combines modern design principles with traditional Indian Vastu guidelines, generating 2D floor plans and 3D walkthroughs.",
    githubUrl: "https://github.com/Ansika-Singh/Agni-AI",
    language: "TypeScript",
    accentColor: "#f43f5e",
    stars: "0",
    forks: "0",
  },
  {
    id: "2b0c28a5-2b26-4aa9-8bc3-27b2145d06ee",
    title: "WireForge",
    description: "A Braille wireframe viewer and terminal user interface (TUI) editor created in Rust using the Ratatui framework.",
    githubUrl: "https://github.com/Vaishnav-Sabari-Girish/wireforge",
    language: "Rust",
    accentColor: "#dea584",
    stars: "0",
    forks: "0",
  },
  {
    id: "8edec7ee-3f19-455b-b1b8-7b361b4980a1",
    title: "FinSight - Personal Finance & Investment Tracker",
    description: "A comprehensive personal finance tracking dashboard featuring automated SIP analysis, AI forecasting, receipt optical character recognition (OCR), and investment portfolio management.",
    githubUrl: "https://github.com/AyushKhaitan1/FinSight",
    language: "TypeScript",
    accentColor: "#10b981",
    stars: "0",
    forks: "0",
  },
  {
    id: "4aa5798c-48ff-421f-9325-00db7cf98a50",
    title: "KL-eats (food pre-ordering system)",
    description: "A campus and community-oriented food pre-ordering and discovery platform enabling students to explore menus, pre-order meals, and minimize dining wait times.",
    githubUrl: "https://github.com/Kunjalb29/kleatsv1",
    language: "Java",
    accentColor: "#f59e0b",
    stars: "0",
    forks: "0",
  },
  {
    id: "a9f9c9c8-107a-4bde-b1f8-b907b18deb8a",
    title: "DNA sequence matching",
    description: "A bioinformatics software application built to compare DNA sequences, perform nucleotide pattern matching (A, T, C, G), compute similarity matrices, and process NCBI biological datasets.",
    githubUrl: "https://github.com/Manyatomar21/Dnasequencematchingfrontend",
    language: "Java",
    accentColor: "#8b5cf6",
    stars: "0",
    forks: "0",
  },
  {
    id: "826e5c04-b796-4baf-a249-b3c42a753e68",
    title: "LinkedIn Clone (Microservice Architecture)",
    description: "A distributed microservices professional social network system utilizing Neo4j graph databases for modeling user connection degrees and Apache Kafka for event-driven message queuing.",
    githubUrl: "https://github.com/Deepak-Sharma-141/linkedIn-clone",
    language: "Java",
    accentColor: "#0284c7",
    stars: "0",
    forks: "0",
  },
  {
    id: "755a6ce3-20c8-47cb-8a48-4f46790c4409",
    title: "Telecom Churn prediction",
    description: "Supervised classification machine learning model pipeline to detect and predict churn probabilities among telecom subscribers using feature engineering and demographic analytics.",
    githubUrl: "https://github.com/Yash-Agarwal-4a5h/Telecom-Customer-Churn-Prediction-System",
    language: "Python",
    accentColor: "#ec4899",
    stars: "0",
    forks: "0",
  },
  {
    id: "28c2c349-6f65-47ff-89ce-cb2b5cc45493",
    title: "Scout",
    description: "An open-source multi-agent intelligence and research workspace that orchestrates specialized AI agents to investigate complex queries, evaluate sources, verify facts, and produce evidence-backed reports.",
    githubUrl: "https://github.com/Tanmay-Mirgal/scout",
    language: "TypeScript",
    accentColor: "#6366f1",
    stars: "0",
    forks: "0",
  },
  {
    id: "e720f832-7fb2-48ea-92fe-74a0916acd90",
    title: "Customer Churn Prediction",
    description: "An end-to-end customer churn classification solution leveraging XGBoost and scikit-learn models to identify retention risks across customer cohorts.",
    githubUrl: "https://github.com/Ratnakmri/Customer-Churn-Prediction",
    language: "Python",
    accentColor: "#14b8a6",
    stars: "0",
    forks: "0",
  },
  {
    id: "321f207c-1da3-452f-926b-e8aa5b72c225",
    title: "e-commerce style wardobe",
    description: "A TypeScript-based apparel e-commerce web platform offering granular category-based filtering, men/women/kids collections, and responsive checkout interfaces.",
    githubUrl: "https://github.com/dikshaikify/style-wardrobee",
    language: "TypeScript",
    accentColor: "#f43f5e",
    stars: "0",
    forks: "0",
  },
  {
    id: "99d92002-85b8-4d6c-a878-ea0aa9b56d1e",
    title: "Rai",
    description: "An AI-powered lifestyle and productivity assistant providing contextual scheduling, intelligent suggestions, and full-stack task organization.",
    githubUrl: "https://github.com/rishika-2626/Rai",
    language: "TypeScript",
    accentColor: "#a855f7",
    stars: "0",
    forks: "0",
  },
  {
    id: "20236d48-ae3e-4a88-8f9d-2d42158e5547",
    title: "VedEngine-Pro",
    description: "A lightweight custom web search and aggregation engine focused on fast indexed content discovery and developer-friendly querying.",
    githubUrl: "https://github.com/Subha12125/VedEngine-Pro",
    language: "JavaScript",
    accentColor: "#38bdf8",
    stars: "0",
    forks: "0",
  },
  {
    id: "c9348e6e-7ba7-416b-897b-8cccfe94512b",
    title: "PBTW — Pappu Bhai Tanker Wale",
    description: "A hyper-local logistics and booking platform specifically engineered to streamline, schedule, and track commercial water tanker deliveries.",
    githubUrl: "https://www.github.com/aryan1994/pbtw",
    language: "TypeScript",
    accentColor: "#0284c7",
    stars: "0",
    forks: "0",
  },
  {
    id: "e3403d54-57b6-47bd-9865-bddcdff7a3be",
    title: "NXTpath",
    description: "A career roadmap and skill pathway discovery platform guiding students toward personalized technical milestones.",
    githubUrl: "https://github.com/akhilesh-kumar/NXTpath",
    language: "TypeScript",
    accentColor: "#10b981",
    stars: "0",
    forks: "0",
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
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    return Boolean(profile && (profile.role === "admin" || profile.role === "project-admin"));
  } catch {
    return false;
  }
}

interface DbProjectRow {
  id: string | number;
  name?: string;
  title?: string;
  description?: string | null;
  github_repo_url?: string | null;
  github_url?: string | null;
  githubUrl?: string | null;
  language?: string | null;
  accent_color?: string | null;
  accentColor?: string | null;
  stars?: string | number | null;
  forks?: string | number | null;
  created_at?: string;
}

/**
 * Parses a database row from public.projects into a clean ProjectItem.
 * Extracts title from `name`, repo from `github_repo_url`, and extra metadata from embedded comment or columns.
 */
function parseProjectFromDb(row: DbProjectRow): ProjectItem {
  let cleanDesc = row.description || "";
  let language = "TypeScript";
  let accentColor = "#FF7518";
  let stars = "0";
  let forks = "0";
  let openIssues = "0";
  let unassignedIssues = "0";

  if (row.language) language = row.language;
  if (row.accent_color || row.accentColor) accentColor = row.accent_color || row.accentColor || "#FF7518";
  if (row.stars) stars = String(row.stars);
  if (row.forks) forks = String(row.forks);

  const metaMatch = cleanDesc.match(/<!--meta:(.*?)-->/);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      if (parsed.language) language = parsed.language;
      if (parsed.accentColor) accentColor = parsed.accentColor;
      if (parsed.stars) stars = String(parsed.stars);
      if (parsed.forks) forks = String(parsed.forks);
      if (parsed.openIssues !== undefined) openIssues = String(parsed.openIssues);
      if (parsed.unassignedIssues !== undefined) unassignedIssues = String(parsed.unassignedIssues);
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
    openIssues,
    unassignedIssues,
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

  return DEFAULT_PROJECTS;
}

// Module-level cache for repo slugs (10-minute TTL to prevent repeated DB reads during high sync volume)
let _slugCache: Set<string> | null = null;
let _slugCacheAt = 0;
const SLUG_CACHE_TTL_MS = 10 * 60 * 1000;

export async function invalidateSlugCache(): Promise<void> {
  _slugCache = null;
  _slugCacheAt = 0;
}

/**
 * Fetches the set of allowed GitHub repository slugs directly from the active projects.
 * Guarantees 100% parity with the projects displayed in the /projects section.
 * PRs will ONLY be accepted if their repository slug is present in this set.
 */
export async function getDbAllowedRepoSlugs(): Promise<Set<string>> {
  if (_slugCache && Date.now() - _slugCacheAt < SLUG_CACHE_TTL_MS) {
    return _slugCache;
  }

  // Always include the exact official competition repositories
  const allowed = new Set<string>(OFFICIAL_COMPETITION_REPO_SLUGS);
  try {
    const projects = await getProjects();
    for (const p of projects) {
      const slug = extractRepoSlug(p.githubUrl);
      if (slug) {
        allowed.add(slug.toLowerCase());
      }
    }
  } catch (err) {
    console.warn("Exception deriving allowed slugs from getProjects:", err);
  }

  _slugCache = allowed;
  _slugCacheAt = Date.now();
  return allowed;
}

export interface DiscoveredProjectResult {
  success: boolean;
  topic: string;
  totalFound: number;
  addedCount: number;
  updatedCount: number;
  projects: ProjectItem[];
  error?: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3b82f6",
  Rust: "#dea584",
  Go: "#00add8",
  Java: "#b07219",
  "C++": "#a855f7",
  C: "#555555",
  Dart: "#00b4ab",
  Flutter: "#FF7518",
  Kotlin: "#a97bff",
  Swift: "#f05138",
  Ruby: "#701516",
  PHP: "#4f5d95",
  HTML: "#e34c26",
  CSS: "#563d7c",
};

interface GitHubSearchRepoItem {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics?: string[];
  owner?: {
    login: string;
    type?: string;
    avatar_url?: string;
  };
}

// In-memory discovery cache with 30-minute TTL to protect GitHub Search API limits (30 req/min)
let _discoveryCache: { timestamp: number; topic: string; result: DiscoveredProjectResult } | null = null;
const DISCOVERY_CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * Discovers and ingests participating repositories dynamically using GitHub's Search API.
 * Maintainers simply add the topic tag (default: 'osci-2026') to their repository settings.
 *
 * Query format: topic:{topic} fork:false
 * Auto-upserts newly discovered repositories into public.projects and synchronizes the local cache.
 */
export async function discoverProjectsByTopic(
  topic = "osci-2026",
  forceRefresh = false
): Promise<DiscoveredProjectResult> {
  const cleanTopic = topic.trim().toLowerCase().replace(/^#/, "");

  if (
    !forceRefresh &&
    _discoveryCache &&
    _discoveryCache.topic === cleanTopic &&
    Date.now() - _discoveryCache.timestamp < DISCOVERY_CACHE_TTL_MS
  ) {
    return _discoveryCache.result;
  }

  const headers = getGitHubAuthHeaders();
  const searchUrl = `https://api.github.com/search/repositories?q=topic:${encodeURIComponent(cleanTopic)}+fork:false&sort=updated&order=desc&per_page=100`;

  let githubItems: GitHubSearchRepoItem[] = [];

  try {
    const res = await fetch(searchUrl, {
      headers,
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`Notice: GitHub repository search for topic "${cleanTopic}" failed (${res.status}): ${errText}`);
      const fallbackProjects = await getProjects();
      const failResult: DiscoveredProjectResult = {
        success: false,
        topic: cleanTopic,
        totalFound: 0,
        addedCount: 0,
        updatedCount: 0,
        projects: fallbackProjects,
        error: `GitHub API error (${res.status}): ${res.statusText}`,
      };
      return failResult;
    }

    const data = await res.json();
    if (Array.isArray(data.items)) {
      githubItems = data.items;
    }
  } catch (err: unknown) {
    console.warn("Notice: Exception querying GitHub Search API for topic repos:", err);
    const fallbackProjects = await getProjects();
    return {
      success: false,
      topic: cleanTopic,
      totalFound: 0,
      addedCount: 0,
      updatedCount: 0,
      projects: fallbackProjects,
      error: err instanceof Error ? err.message : "Search API request failed",
    };
  }

  let addedCount = 0;
  let updatedCount = 0;

  try {
    const admin = createAdminClient();

    // Fetch existing projects from database to match by repo slug
    const { data: dbRows, error: dbErr } = await admin
      .from("projects")
      .select("*");

    if (dbErr) {
      console.warn("Notice: Querying projects for topic discovery:", dbErr.message);
    }

    const existingBySlug = new Map<string, DbProjectRow>();
    for (const row of (dbRows as DbProjectRow[]) || []) {
      const slug = extractRepoSlug(row.github_repo_url || row.github_url || row.githubUrl);
      if (slug) {
        existingBySlug.set(slug, row);
      }
    }

    const newProjectsToInsert: Array<{
      name: string;
      github_repo_url: string;
      description: string;
    }> = [];

    for (const item of githubItems) {
      const slug = extractRepoSlug(item.html_url);
      if (!slug) continue;

      const lang = item.language || "TypeScript";
      const accentColor = LANGUAGE_COLORS[lang] || "#FF7518";
      const stars = String(item.stargazers_count ?? 0);
      const forks = String(item.forks_count ?? 0);
      const rawDesc = item.description || "Community open source project participating in OSC India.";
      const metaPayload = {
        language: lang,
        accentColor,
        stars,
        forks,
      };
      const dbDescription = `${rawDesc.trim()}\n<!--meta:${JSON.stringify(metaPayload)}-->`;

      if (!existingBySlug.has(slug)) {
        // New project discovered!
        newProjectsToInsert.push({
          name: item.name,
          github_repo_url: item.html_url,
          description: dbDescription,
        });
        addedCount++;
      } else {
        // Existing project: update stars/forks if changed
        const existing = existingBySlug.get(slug)!;
        const currentMeta = parseProjectFromDb(existing);
        if (currentMeta.stars !== stars || currentMeta.forks !== forks) {
          try {
            await admin
              .from("projects")
              .update({ description: dbDescription, updated_at: new Date().toISOString() })
              .eq("id", existing.id);
            updatedCount++;
          } catch {
            // Non-critical update
          }
        }
      }
    }

    if (newProjectsToInsert.length > 0) {
      const { error: insertErr } = await admin
        .from("projects")
        .insert(newProjectsToInsert);

      if (insertErr) {
        console.warn("Notice: Inserting discovered projects:", insertErr.message);
      }
    }

    // Invalidate caches so callers get fresh allowed repo slugs and project lists
    await invalidateSlugCache();
  } catch (syncErr) {
    console.warn("Notice: Ingesting discovered projects to Supabase:", syncErr);
  }

  const allProjects = await getProjects();

  // Revalidate public pages
  try {
    revalidatePath("/projects");
    revalidatePath("/admin");
  } catch {}

  const finalResult: DiscoveredProjectResult = {
    success: true,
    topic: cleanTopic,
    totalFound: githubItems.length,
    addedCount,
    updatedCount,
    projects: allProjects,
  };

  _discoveryCache = {
    timestamp: Date.now(),
    topic: cleanTopic,
    result: finalResult,
  };

  return finalResult;
}

/**
 * Creates and registers a new project directly in the Supabase database.
 * Syncs with local JSON cache and automatically triggers page revalidation.
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
  } catch (err: unknown) {
    console.error("Database project creation exception:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to save project to database." };
  }

  // Also sync to local backup
  const currentLocal = readLocalCustomProjects();
  writeLocalCustomProjects([createdProject, ...currentLocal.filter((p) => p.id !== createdProject.id)]);

  await invalidateSlugCache();
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
  } catch (err: unknown) {
    console.error("Database project deletion exception:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete project from database." };
  }

  // 3. Keep local backup cache synchronized
  const localCustom = readLocalCustomProjects();
  const filtered = localCustom.filter(
    (p) => p.id !== cleanId && p.githubUrl !== cleanId && p.title.toLowerCase() !== cleanId.toLowerCase()
  );
  writeLocalCustomProjects(filtered);

  await invalidateSlugCache();
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

    await invalidateSlugCache();
    revalidatePath("/projects");
    revalidatePath("/admin");

    return { success: true, count: data ? data.length : 0 };
  } catch (err: unknown) {
    console.error("Database deleteAllProjectsAction exception:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete all projects from database." };
  }
}
