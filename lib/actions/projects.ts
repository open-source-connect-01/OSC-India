"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminSession } from "@/lib/auth/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { extractRepoSlug, OFFICIAL_COMPETITION_REPO_SLUGS, getGitHubAuthHeaders } from "@/lib/utils/github-helpers";
import { ProjectStatus, readProjectMeta } from "@/lib/utils/project-meta";

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
  /** Approval state; projects without a status are approved. */
  status?: ProjectStatus;
  /** GitHub handle of the project admin who submitted / manages this project. */
  submittedBy?: string;
  rejectionReason?: string;
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
    "id": "662dbbb3-6e77-42ef-99af-57273a1c36e1",
    "title": "Truxify – Broker-Free Freight Marketplace",
    "description": "An open-source, broker-free freight marketplace connecting manufacturers directly with truck drivers for transparent pricing, live GPS tracking, and instant load bookings.",
    "githubUrl": "https://github.com/KanishJebaMathewM/Truxify",
    "language": "Flutter",
    "accentColor": "#FF7518",
    "stars": "40",
    "forks": "195",
    "openIssues": "1172",
    "unassignedIssues": "655"
  },
  {
    "id": "ce0a4ddd-a220-4f05-bf3a-24b949761c40",
    "title": "iloveAgents",
    "description": "AI agents worth falling in love with. An open-source ecosystem of specialized autonomous agents built by the community and loved by everyone.",
    "githubUrl": "https://github.com/AditthyaSS/iloveAgents",
    "language": "JavaScript",
    "accentColor": "#ec4899",
    "stars": "117",
    "forks": "200",
    "openIssues": "137",
    "unassignedIssues": "50"
  },
  {
    "id": "585baad7-e2ca-46aa-bc1d-12d1040abb9e",
    "title": "adaptq",
    "description": "High-performance C++17 KV cache compression and quantization engine for LLM inference with Python bindings, SIMD acceleration, and multi-backend edge deployment.",
    "githubUrl": "https://github.com/l3tchupkt/adaptq",
    "language": "C++",
    "accentColor": "#10b981",
    "stars": "7",
    "forks": "23",
    "openIssues": "63",
    "unassignedIssues": "20"
  },
  {
    "id": "86052217-73a6-4f0a-80b1-3288fd3e4388",
    "title": "Bolcap",
    "description": "AI-powered viral-moment video clipping and Hinglish caption engine utilizing Whisper word-level transcription, customizable animated captions, and alpha overlay MOV exports.",
    "githubUrl": "https://github.com/AdityaPainuli/clippings-vids",
    "language": "Python",
    "accentColor": "#ef4444",
    "stars": "4",
    "forks": "18",
    "openIssues": "93",
    "unassignedIssues": "40"
  },
  {
    "id": "cf66728e-67dd-444d-9536-bf05ccf8e581",
    "title": "PrepPilot",
    "description": "An all-in-one interview preparation platform that helps candidates organize, track, practice mock interviews, and streamline their technical career preparation in one place.",
    "githubUrl": "https://github.com/Canopus-Labs/PrepPilot",
    "language": "JavaScript",
    "accentColor": "#3b82f6",
    "stars": "23",
    "forks": "142",
    "openIssues": "8",
    "unassignedIssues": "8"
  },
  {
    "id": "a7ccbff8-f3fd-4a07-a9d4-fba5a667490d",
    "title": "Air Quality Intelligence Platform",
    "description": "A local-first, open-source data engineering and analytics platform for real-time air-quality monitoring, anomaly detection, and near-term PM2.5 forecasting using sensor streams.",
    "githubUrl": "https://github.com/AseemPrasad/Air-Quality-Intelligence",
    "language": "Python",
    "accentColor": "#059669",
    "stars": "4",
    "forks": "25",
    "openIssues": "13",
    "unassignedIssues": "1"
  },
  {
    "id": "823673b1-14f7-4de1-8944-836dd8486a17",
    "title": "Secureflow",
    "description": "AI-powered code security analysis platform integrating with GitHub pull requests to automatically detect vulnerabilities, security regressions, and provide instant remediation guidance.",
    "githubUrl": "https://github.com/GauravKarakoti/Secureflow",
    "language": "TypeScript",
    "accentColor": "#6366f1",
    "stars": "10",
    "forks": "79",
    "openIssues": "8",
    "unassignedIssues": "0"
  },
  {
    "id": "b43b290e-ed2a-4d3d-9b28-0bf7d196177b",
    "title": "AI Product Factory",
    "description": "An open-source agentic platform helping developers and non-technical founders turn ideas into implementation-ready software specs, architectures, and runnable code through specialized AI agents.",
    "githubUrl": "https://github.com/logeshv586-code/AIproductfactory",
    "language": "Python",
    "accentColor": "#f43f5e",
    "stars": "5",
    "forks": "12",
    "openIssues": "10",
    "unassignedIssues": "2"
  },
  {
    "id": "6248bf04-686e-43cf-a1bc-30823de25cc9",
    "title": "Harshal World",
    "description": "An interactive web portal and arcade gaming showcase built for responsive browser exploration, engaging web utilities, and open-source frontend community collaboration.",
    "githubUrl": "https://github.com/harshalkurrey/Harshal-World",
    "language": "JavaScript",
    "accentColor": "#f59e0b",
    "stars": "1",
    "forks": "26",
    "openIssues": "9",
    "unassignedIssues": "9"
  },
  {
    "id": "2c9c9117-4df5-4758-b970-efa0d7ac86c4",
    "title": "LinkID",
    "description": "A decentralized persistent identity protocol and developer toolkit ensuring unified link routing, verifiable creator credentials, and anti-link-rot infrastructure.",
    "githubUrl": "https://github.com/vishnukothakapu/linkid",
    "language": "TypeScript",
    "accentColor": "#06b6d4",
    "stars": "25",
    "forks": "109",
    "openIssues": "32",
    "unassignedIssues": "10"
  },
  {
    "id": "5d374d0a-94ce-4363-94c4-be597fd9f4f0",
    "title": "DevWhisper",
    "description": "Voice-first AI agent for developers. Instead of stopping to browse files or documentation, developers speak questions out loud and receive instant answers grounded in the local codebase.",
    "githubUrl": "https://github.com/Aharshi3614/Devwhisper",
    "language": "Python",
    "accentColor": "#8b5cf6",
    "stars": "3",
    "forks": "31",
    "openIssues": "17",
    "unassignedIssues": "5"
  },
  {
    "id": "4dd1a235-7af8-4db5-99f9-8555fbf30457",
    "title": "AthLead",
    "description": "AI-powered sports talent discovery and national ranking platform built for the Ministry of Youth Affairs & Sports, identifying grassroots athletes through computer vision metrics.",
    "githubUrl": "https://github.com/Harsh-vardhan09/AthLead",
    "language": "JavaScript",
    "accentColor": "#10b981",
    "stars": "23",
    "forks": "24",
    "openIssues": "5",
    "unassignedIssues": "5"
  },
  {
    "id": "bbd4b878-1802-46cf-81a0-6bc098e118a4",
    "title": "Workshpere",
    "description": "Multi-agent AI workspace discovery platform that helps remote workers locate ideal cafes and coworking environments with noise levels, Wi-Fi speeds, and community ratings.",
    "githubUrl": "https://github.com/SatyamPandey-07/WorkSphere",
    "language": "TypeScript",
    "accentColor": "#3b82f6",
    "stars": "18",
    "forks": "77",
    "openIssues": "212",
    "unassignedIssues": "50"
  },
  {
    "id": "f180dd00-fb06-43b0-bbb5-815d88dd2b8a",
    "title": "Kiranawala",
    "description": "Hyper-local grocery delivery and store management platform digitizing Indian neighborhood kirana shops with digital catalogs, inventory tracking, and direct customer ordering.",
    "githubUrl": "https://github.com/Jyatin/KiranaWala",
    "language": "JavaScript",
    "accentColor": "#f97316",
    "stars": "0",
    "forks": "1",
    "openIssues": "0",
    "unassignedIssues": "0"
  },
  {
    "id": "7b8854e9-adbb-498e-b2ee-1855f0409275",
    "title": "TraffiTech",
    "description": "Smart traffic monitoring and urban congestion management platform leveraging computer vision and sensor analytics to optimize signal timing and reduce city road bottleneck delays.",
    "githubUrl": "https://github.com/10-Mohan/Trafitech",
    "language": "JavaScript",
    "accentColor": "#eab308",
    "stars": "0",
    "forks": "0",
    "openIssues": "0",
    "unassignedIssues": "0"
  },
  {
    "id": "d3f9d1b4-733b-4645-9059-120697002716",
    "title": "CreatorOS",
    "description": "Open-source all-in-one business dashboard for digital creators, unifying bio links, direct message automation, customer relationships, revenue tracking, and content scheduling.",
    "githubUrl": "https://github.com/aashutoshkumarbhardwaj/CreatorOs",
    "language": "JavaScript",
    "accentColor": "#f43f5e",
    "stars": "42",
    "forks": "92",
    "openIssues": "72",
    "unassignedIssues": "15"
  },
  {
    "id": "2b0c28a5-2b26-4aa9-8bc3-27b2145d06ee",
    "title": "DesktopAI",
    "description": "Voice-activated AI desktop assistant for Linux and desktop environments. Responds to custom wake words, executes terminal actions, launches apps, and provides intelligent contextual help.",
    "githubUrl": "https://github.com/Harshbansal8705/DesktopAI",
    "language": "Python",
    "accentColor": "#0284c7",
    "stars": "0",
    "forks": "0",
    "openIssues": "0",
    "unassignedIssues": "0"
  },
  {
    "id": "4aa5798c-48ff-421f-9325-00db7cf98a50",
    "title": "JuggadLang",
    "description": "A modern programming language crafted with Hindi keywords and Indian developer idioms. Write syntax the way you think, dream, and code with an interactive REPL and VS Code tooling.",
    "githubUrl": "https://github.com/JugaadLang/jugaadlang",
    "language": "Python",
    "accentColor": "#f97316",
    "stars": "18",
    "forks": "39",
    "openIssues": "31",
    "unassignedIssues": "0"
  },
  {
    "id": "8edec7ee-3f19-455b-b1b8-7b361b4980a1",
    "title": "AI Stock Analyzer",
    "description": "Interactive financial analysis web application delivering technical charting, candlestick pattern recognition, and predictive machine learning models for equity forecasting.",
    "githubUrl": "https://github.com/SrigadaAkshayKumar/stock",
    "language": "Python",
    "accentColor": "#14b8a6",
    "stars": "37",
    "forks": "108",
    "openIssues": "55",
    "unassignedIssues": "9"
  },
  {
    "id": "a9f9c9c8-107a-4bde-b1f8-b907b18deb8a",
    "title": "PocketOps",
    "description": "Unified utility dashboard for Android hosting offline UPI QR generation, quick WhatsApp messaging, social shortcuts, and cloud developer utilities under open-source tooling.",
    "githubUrl": "https://github.com/IIXII-L192/PocketOps-app",
    "language": "Kotlin",
    "accentColor": "#6366f1",
    "stars": "1",
    "forks": "0",
    "openIssues": "0",
    "unassignedIssues": "0"
  },
  {
    "id": "826e5c04-b796-4baf-a249-b3c42a753e68",
    "title": "WalletWise",
    "description": "Holistic personal finance platform combining automated budget analytics, behavioral spending insights, and AI-driven advisory to empower students and young professionals.",
    "githubUrl": "https://github.com/SoumyaMishra-7/WalletWise",
    "language": "JavaScript",
    "accentColor": "#10b981",
    "stars": "29",
    "forks": "87",
    "openIssues": "165",
    "unassignedIssues": "19"
  },
  {
    "id": "755a6ce3-20c8-47cb-8a48-4f46790c4409",
    "title": "WinAurex",
    "description": "Comprehensive Windows performance optimization suite and telemetry debloater, delivering automated latency reductions, registry tuning, driver management, and privacy scripts.",
    "githubUrl": "https://github.com/YTxFSGAMERz/WinAurex",
    "language": "Batchfile",
    "accentColor": "#a855f7",
    "stars": "7",
    "forks": "0",
    "openIssues": "1",
    "unassignedIssues": "0"
  },
  {
    "id": "28c2c349-6f65-47ff-89ce-cb2b5cc45493",
    "title": "hiero-bot-py",
    "description": "FastAPI-based GitHub maintainer automation bot streamlining repository workflows with PR health scoring, reviewer recommendations, issue triage, and live analytics dashboards.",
    "githubUrl": "https://github.com/AnthropicBots/hiero-bot-py",
    "language": "Python",
    "accentColor": "#06b6d4",
    "stars": "25",
    "forks": "16",
    "openIssues": "24",
    "unassignedIssues": "10"
  },
  {
    "id": "e720f832-7fb2-48ea-92fe-74a0916acd90",
    "title": "Dockfleet",
    "description": "Free and open-source, local-first Docker container orchestration tool engineered for solo developers and small teams to deploy, monitor, and scale multi-service stacks on a single VPS.",
    "githubUrl": "https://github.com/pratyushjha06/Dockfleet",
    "language": "Python",
    "accentColor": "#0284c7",
    "stars": "14",
    "forks": "29",
    "openIssues": "9",
    "unassignedIssues": "0"
  },
  {
    "id": "321f207c-1da3-452f-926b-e8aa5b72c225",
    "title": "TCalc — Local-First AI Coding Context & Token Intelligence Toolkit",
    "description": "Local-first developer toolkit for analyzing repository token footprints, generating smart repo maps, optimizing model context windows, and integrating with Cursor, Claude Code, and MCP.",
    "githubUrl": "https://github.com/Sandesh13fr/TCalc",
    "language": "TypeScript",
    "accentColor": "#8b5cf6",
    "stars": "15",
    "forks": "16",
    "openIssues": "35",
    "unassignedIssues": "2"
  },
  {
    "id": "99d92002-85b8-4d6c-a878-ea0aa9b56d1e",
    "title": "Advanced Discord Bot",
    "description": "Feature-rich, community-focused Discord bot featuring Google Gemini AI conversation, automated moderation, interactive mini-games, dynamic XP leveling, and custom server plugins.",
    "githubUrl": "https://github.com/AdvancedDiscordBot/Advanced-Discord-Bot",
    "language": "JavaScript",
    "accentColor": "#5865F2",
    "stars": "0",
    "forks": "0",
    "openIssues": "35",
    "unassignedIssues": "15"
  },
  {
    "id": "20236d48-ae3e-4a88-8f9d-2d42158e5547",
    "title": "LixBlogs",
    "description": "Ultra-clean, modern publishing platform and markdown developer blogging engine built on Cloudflare edge workers, D1 databases, and Next.js for high-speed technical storytelling.",
    "githubUrl": "https://github.com/elixpo/blogs.elixpo",
    "language": "JavaScript",
    "accentColor": "#38bdf8",
    "stars": "10",
    "forks": "10",
    "openIssues": "21",
    "unassignedIssues": "5"
  },
  {
    "id": "c9348e6e-7ba7-416b-897b-8cccfe94512b",
    "title": "CIVICFIX",
    "description": "Crowdsourced civic grievance reporting portal connecting citizens with municipal authorities for tracking potholes, sanitation, water shortages, and public infrastructure repairs.",
    "githubUrl": "https://github.com/Janani-bn/CivicFix",
    "language": "JavaScript",
    "accentColor": "#10b981",
    "stars": "2",
    "forks": "5",
    "openIssues": "9",
    "unassignedIssues": "0"
  },
  {
    "id": "e3403d54-57b6-47bd-9865-bddcdff7a3be",
    "title": "OpenHire",
    "description": "Transparent, open-source technical recruitment platform that matches candidates directly with engineering teams through verified skills, portfolio benchmarks, and fair assessment.",
    "githubUrl": "https://github.com/DevSidd2006/openhire",
    "language": "Python",
    "accentColor": "#f43f5e",
    "stars": "3",
    "forks": "3",
    "openIssues": "0",
    "unassignedIssues": "0"
  }
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
 * Validates Super Admin permissions for project modifications.
 * Project Admins may only submit projects for approval (see addProjectAsAdminAction).
 */
async function checkAdminAuth(): Promise<boolean> {
  const isAdminSession = await verifyAdminSession();
  if (isAdminSession) return true;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const rootAdminEmail = (process.env.ADMIN_PORTAL_EMAIL || "sayanghosh1887@gmail.com").toLowerCase().trim();
    if ((user.email || "").toLowerCase().trim() === rootAdminEmail) return true;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    return profile?.role === "admin";
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

  const rawMeta = readProjectMeta(row.description);
  const status: ProjectStatus =
    rawMeta.status === "pending" || rawMeta.status === "rejected" ? rawMeta.status : "approved";

  return {
    id: String(row.id),
    status,
    submittedBy: typeof rawMeta.admin_github === "string" ? rawMeta.admin_github : undefined,
    rejectionReason: typeof rawMeta.rejection_reason === "string" ? rawMeta.rejection_reason : undefined,
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
      // Only approved projects are public / count for scoring; pending & rejected stay hidden
      const projects = data.map(parseProjectFromDb).filter((p) => p.status === "approved");
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

/**
 * Returns every project including pending and rejected submissions.
 * Restricted to admins / project admins (who only see submissions through their own portal filters).
 */
export async function getAllProjectsForAdmins(): Promise<ProjectItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let allowed = await verifyAdminSession();
  if (!allowed && user) {
    const { data: profile } = await createAdminClient()
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    allowed = profile?.role === "admin" || profile?.role === "project-admin";
  }
  if (!allowed) return [];

  const { data, error } = await createAdminClient().from("projects").select("*");
  if (error || !Array.isArray(data)) return [];
  return data.map(parseProjectFromDb);
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
            // Preserve approval status / submitter so a refresh never approves a pending project
            const preserved = readProjectMeta(existing.description);
            const mergedMeta = { ...metaPayload, ...(preserved.status ? { status: preserved.status } : {}),
              ...(preserved.admin_github ? { admin_github: preserved.admin_github } : {}),
              ...(preserved.rejection_reason ? { rejection_reason: preserved.rejection_reason } : {}) };
            await admin
              .from("projects")
              .update({ description: `${rawDesc.trim()}\n<!--meta:${JSON.stringify(mergedMeta)}-->` })
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
