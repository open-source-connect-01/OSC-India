import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ProjectsClient, { ProjectData } from "./ProjectsClient";
import { getProjects } from "@/lib/actions/projects";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface ProjectMeta {
  tags: string[];
  category: string;
  iconType: string;
  accentColor: string;
  mockupDescription?: string;
  stars?: string;
  forks?: string;
  openIssues?: string;
  unassignedIssues?: string;
}

const PROJECT_META_MAP: Record<string, ProjectMeta> = {
  "Truxify – Broker-Free Freight Marketplace": {
    "tags": [
      "Flutter",
      "Dart",
      "Firebase",
      "Node.js",
      "Logistics",
      "Open Source"
    ],
    "category": "Logistics & Supply Chain",
    "iconType": "truck",
    "accentColor": "#FF7518",
    "mockupDescription": "An open-source, broker-free freight marketplace connecting manufacturers directly with truck drivers for transparent pricing, live GPS tracking, and instant load bookings.",
    "stars": "40",
    "forks": "195",
    "openIssues": "1172",
    "unassignedIssues": "655"
  },
  "Truxify": {
    "tags": [
      "Flutter",
      "Dart",
      "Firebase",
      "Node.js",
      "Logistics",
      "Open Source"
    ],
    "category": "Logistics & Supply Chain",
    "iconType": "truck",
    "accentColor": "#FF7518",
    "mockupDescription": "An open-source, broker-free freight marketplace connecting manufacturers directly with truck drivers for transparent pricing, live GPS tracking, and instant load bookings.",
    "stars": "40",
    "forks": "195",
    "openIssues": "1172",
    "unassignedIssues": "655"
  },
  "iloveAgents": {
    "tags": [
      "JavaScript",
      "AI Agents",
      "Autonomous",
      "LLM",
      "Open Source"
    ],
    "category": "Machine Learning / AI",
    "iconType": "sparkles",
    "accentColor": "#ec4899",
    "mockupDescription": "AI agents worth falling in love with. An open-source ecosystem of specialized autonomous agents built by the community and loved by everyone.",
    "stars": "117",
    "forks": "200",
    "openIssues": "137",
    "unassignedIssues": "50"
  },
  "adaptq": {
    "tags": [
      "C++",
      "LLM Inference",
      "KV Cache",
      "SIMD",
      "Quantization"
    ],
    "category": "Systems & Low Level",
    "iconType": "cpu",
    "accentColor": "#10b981",
    "mockupDescription": "High-performance C++17 KV cache compression and quantization engine for LLM inference with Python bindings, SIMD acceleration, and multi-backend edge deployment.",
    "stars": "7",
    "forks": "23",
    "openIssues": "63",
    "unassignedIssues": "20"
  },
  "AdapTQ": {
    "tags": [
      "C++",
      "LLM Inference",
      "KV Cache",
      "SIMD",
      "Quantization"
    ],
    "category": "Systems & Low Level",
    "iconType": "cpu",
    "accentColor": "#10b981",
    "mockupDescription": "High-performance C++17 KV cache compression and quantization engine for LLM inference with Python bindings, SIMD acceleration, and multi-backend edge deployment.",
    "stars": "7",
    "forks": "23",
    "openIssues": "63",
    "unassignedIssues": "20"
  },
  "Bolcap": {
    "tags": [
      "Python",
      "Whisper",
      "Video Processing",
      "AI/ML",
      "Hinglish"
    ],
    "category": "Video & Media",
    "iconType": "video",
    "accentColor": "#ef4444",
    "mockupDescription": "AI-powered viral-moment video clipping and Hinglish caption engine utilizing Whisper word-level transcription, customizable animated captions, and alpha overlay MOV exports.",
    "stars": "4",
    "forks": "18",
    "openIssues": "93",
    "unassignedIssues": "40"
  },
  "PrepPilot": {
    "tags": [
      "JavaScript",
      "React",
      "EdTech",
      "Interview Prep",
      "Career"
    ],
    "category": "EdTech & Career Pathways",
    "iconType": "layout",
    "accentColor": "#3b82f6",
    "mockupDescription": "An all-in-one interview preparation platform that helps candidates organize, track, practice mock interviews, and streamline their technical career preparation in one place.",
    "stars": "23",
    "forks": "142",
    "openIssues": "8",
    "unassignedIssues": "8"
  },
  "Air Quality Intelligence Platform": {
    "tags": [
      "Python",
      "FastAPI",
      "Polars",
      "Data Engineering",
      "IoT",
      "Air Quality"
    ],
    "category": "Environmental & IoT",
    "iconType": "leaf",
    "accentColor": "#059669",
    "mockupDescription": "A local-first, open-source data engineering and analytics platform for real-time air-quality monitoring, anomaly detection, and near-term PM2.5 forecasting using sensor streams.",
    "stars": "4",
    "forks": "25",
    "openIssues": "13",
    "unassignedIssues": "1"
  },
  "Secureflow": {
    "tags": [
      "TypeScript",
      "Next.js",
      "Security",
      "DevSecOps",
      "AI Code Review"
    ],
    "category": "Security & DevSecOps",
    "iconType": "shield",
    "accentColor": "#6366f1",
    "mockupDescription": "AI-powered code security analysis platform integrating with GitHub pull requests to automatically detect vulnerabilities, security regressions, and provide instant remediation guidance.",
    "stars": "10",
    "forks": "79",
    "openIssues": "8",
    "unassignedIssues": "0"
  },
  "AI Product Factory": {
    "tags": [
      "Python",
      "TypeScript",
      "FastAPI",
      "Agentic AI",
      "Product Factory"
    ],
    "category": "Machine Learning / AI",
    "iconType": "box",
    "accentColor": "#f43f5e",
    "mockupDescription": "An open-source agentic platform helping developers and non-technical founders turn ideas into implementation-ready software specs, architectures, and runnable code through specialized AI agents.",
    "stars": "5",
    "forks": "12",
    "openIssues": "10",
    "unassignedIssues": "2"
  },
  "Harshal World": {
    "tags": [
      "JavaScript",
      "HTML5",
      "CSS3",
      "Frontend",
      "Game Development"
    ],
    "category": "Developer Tools & Productivity",
    "iconType": "layers",
    "accentColor": "#f59e0b",
    "mockupDescription": "An interactive web portal and arcade gaming showcase built for responsive browser exploration, engaging web utilities, and open-source frontend community collaboration.",
    "stars": "1",
    "forks": "26",
    "openIssues": "9",
    "unassignedIssues": "9"
  },
  "LinkID": {
    "tags": [
      "TypeScript",
      "Next.js",
      "Identity",
      "Decentralized",
      "Web3"
    ],
    "category": "Developer Tools & Productivity",
    "iconType": "layers",
    "accentColor": "#06b6d4",
    "mockupDescription": "A decentralized persistent identity protocol and developer toolkit ensuring unified link routing, verifiable creator credentials, and anti-link-rot infrastructure.",
    "stars": "25",
    "forks": "109",
    "openIssues": "32",
    "unassignedIssues": "10"
  },
  "DevWhisper": {
    "tags": [
      "Python",
      "Voice AI",
      "Developer Tools",
      "Codebase Search",
      "LLM"
    ],
    "category": "Developer Tools & Productivity",
    "iconType": "terminal",
    "accentColor": "#8b5cf6",
    "mockupDescription": "Voice-first AI agent for developers. Instead of stopping to browse files or documentation, developers speak questions out loud and receive instant answers grounded in the local codebase.",
    "stars": "3",
    "forks": "31",
    "openIssues": "17",
    "unassignedIssues": "5"
  },
  "AthLead": {
    "tags": [
      "JavaScript",
      "Computer Vision",
      "SportsTech",
      "Government AI",
      "Talent Discovery"
    ],
    "category": "Data Science & Analytics",
    "iconType": "trending-up",
    "accentColor": "#10b981",
    "mockupDescription": "AI-powered sports talent discovery and national ranking platform built for the Ministry of Youth Affairs & Sports, identifying grassroots athletes through computer vision metrics.",
    "stars": "23",
    "forks": "24",
    "openIssues": "5",
    "unassignedIssues": "5"
  },
  "Workshpere": {
    "tags": [
      "TypeScript",
      "Next.js",
      "Multi-Agent AI",
      "Maps",
      "Remote Work"
    ],
    "category": "Enterprise & Cloud",
    "iconType": "layout",
    "accentColor": "#3b82f6",
    "mockupDescription": "Multi-agent AI workspace discovery platform that helps remote workers locate ideal cafes and coworking environments with noise levels, Wi-Fi speeds, and community ratings.",
    "stars": "18",
    "forks": "77",
    "openIssues": "212",
    "unassignedIssues": "50"
  },
  "WorkSphere": {
    "tags": [
      "TypeScript",
      "Next.js",
      "Multi-Agent AI",
      "Maps",
      "Remote Work"
    ],
    "category": "Enterprise & Cloud",
    "iconType": "layout",
    "accentColor": "#3b82f6",
    "mockupDescription": "Multi-agent AI workspace discovery platform that helps remote workers locate ideal cafes and coworking environments with noise levels, Wi-Fi speeds, and community ratings.",
    "stars": "18",
    "forks": "77",
    "openIssues": "212",
    "unassignedIssues": "50"
  },
  "Kiranawala": {
    "tags": [
      "JavaScript",
      "React",
      "Node.js",
      "E-Commerce",
      "Hyper-local",
      "Kirana"
    ],
    "category": "Mobile & Web",
    "iconType": "box",
    "accentColor": "#f97316",
    "mockupDescription": "Hyper-local grocery delivery and store management platform digitizing Indian neighborhood kirana shops with digital catalogs, inventory tracking, and direct customer ordering.",
    "stars": "0",
    "forks": "1",
    "openIssues": "0",
    "unassignedIssues": "0"
  },
  "TraffiTech": {
    "tags": [
      "JavaScript",
      "IoT",
      "Traffic Management",
      "Smart Cities",
      "Analytics"
    ],
    "category": "Environmental & IoT",
    "iconType": "activity",
    "accentColor": "#eab308",
    "mockupDescription": "Smart traffic monitoring and urban congestion management platform leveraging computer vision and sensor analytics to optimize signal timing and reduce city road bottleneck delays.",
    "stars": "0",
    "forks": "0",
    "openIssues": "0",
    "unassignedIssues": "0"
  },
  "CreatorOS": {
    "tags": [
      "JavaScript",
      "Node.js",
      "Express",
      "Creator Economy",
      "CRM",
      "Automation"
    ],
    "category": "Mobile & Web",
    "iconType": "layout",
    "accentColor": "#f43f5e",
    "mockupDescription": "Open-source all-in-one business dashboard for digital creators, unifying bio links, direct message automation, customer relationships, revenue tracking, and content scheduling.",
    "stars": "42",
    "forks": "92",
    "openIssues": "72",
    "unassignedIssues": "15"
  },
  "DesktopAI": {
    "tags": [
      "Python",
      "LangChain",
      "Voice Assistant",
      "Desktop",
      "Automation"
    ],
    "category": "Developer Tools & Productivity",
    "iconType": "cpu",
    "accentColor": "#0284c7",
    "mockupDescription": "Voice-activated AI desktop assistant for Linux and desktop environments. Responds to custom wake words, executes terminal actions, launches apps, and provides intelligent contextual help.",
    "stars": "0",
    "forks": "0",
    "openIssues": "0",
    "unassignedIssues": "0"
  },
  "JuggadLang": {
    "tags": [
      "Python",
      "Compiler",
      "Language Design",
      "Hindi",
      "Developer Tools"
    ],
    "category": "Systems & Low Level",
    "iconType": "terminal",
    "accentColor": "#f97316",
    "mockupDescription": "A modern programming language crafted with Hindi keywords and Indian developer idioms. Write syntax the way you think, dream, and code with an interactive REPL and VS Code tooling.",
    "stars": "18",
    "forks": "39",
    "openIssues": "31",
    "unassignedIssues": "0"
  },
  "JugaadLang": {
    "tags": [
      "Python",
      "Compiler",
      "Language Design",
      "Hindi",
      "Developer Tools"
    ],
    "category": "Systems & Low Level",
    "iconType": "terminal",
    "accentColor": "#f97316",
    "mockupDescription": "A modern programming language crafted with Hindi keywords and Indian developer idioms. Write syntax the way you think, dream, and code with an interactive REPL and VS Code tooling.",
    "stars": "18",
    "forks": "39",
    "openIssues": "31",
    "unassignedIssues": "0"
  },
  "AI Stock Analyzer": {
    "tags": [
      "Python",
      "React",
      "Flask",
      "FinTech",
      "Machine Learning",
      "Stock Market"
    ],
    "category": "Data Science & Analytics",
    "iconType": "chart",
    "accentColor": "#14b8a6",
    "mockupDescription": "Interactive financial analysis web application delivering technical charting, candlestick pattern recognition, and predictive machine learning models for equity forecasting.",
    "stars": "37",
    "forks": "108",
    "openIssues": "55",
    "unassignedIssues": "9"
  },
  "PocketOps": {
    "tags": [
      "Kotlin",
      "Android",
      "Mobile",
      "Utilities",
      "UPI"
    ],
    "category": "Enterprise & Cloud",
    "iconType": "server",
    "accentColor": "#6366f1",
    "mockupDescription": "Unified utility dashboard for Android hosting offline UPI QR generation, quick WhatsApp messaging, social shortcuts, and cloud developer utilities under open-source tooling.",
    "stars": "1",
    "forks": "0",
    "openIssues": "0",
    "unassignedIssues": "0"
  },
  "WalletWise": {
    "tags": [
      "JavaScript",
      "React",
      "FinTech",
      "Budgeting",
      "Personal Finance"
    ],
    "category": "Mobile & Web",
    "iconType": "wallet",
    "accentColor": "#10b981",
    "mockupDescription": "Holistic personal finance platform combining automated budget analytics, behavioral spending insights, and AI-driven advisory to empower students and young professionals.",
    "stars": "29",
    "forks": "87",
    "openIssues": "165",
    "unassignedIssues": "19"
  },
  "WinAurex": {
    "tags": [
      "Batchfile",
      "PowerShell",
      "Windows Optimization",
      "Performance",
      "Gaming"
    ],
    "category": "Systems & Low Level",
    "iconType": "shield",
    "accentColor": "#a855f7",
    "mockupDescription": "Comprehensive Windows performance optimization suite and telemetry debloater, delivering automated latency reductions, registry tuning, driver management, and privacy scripts.",
    "stars": "7",
    "forks": "0",
    "openIssues": "1",
    "unassignedIssues": "0"
  },
  "hiero-bot-py": {
    "tags": [
      "Python",
      "FastAPI",
      "GitHub Bot",
      "Automation",
      "DevOps",
      "Open Source"
    ],
    "category": "Developer Tools & Productivity",
    "iconType": "terminal",
    "accentColor": "#06b6d4",
    "mockupDescription": "FastAPI-based GitHub maintainer automation bot streamlining repository workflows with PR health scoring, reviewer recommendations, issue triage, and live analytics dashboards.",
    "stars": "25",
    "forks": "16",
    "openIssues": "24",
    "unassignedIssues": "10"
  },
  "Dockfleet": {
    "tags": [
      "Python",
      "FastAPI",
      "Docker",
      "DevOps",
      "Containers",
      "Self-Hosted"
    ],
    "category": "Enterprise & Cloud",
    "iconType": "server",
    "accentColor": "#0284c7",
    "mockupDescription": "Free and open-source, local-first Docker container orchestration tool engineered for solo developers and small teams to deploy, monitor, and scale multi-service stacks on a single VPS.",
    "stars": "14",
    "forks": "29",
    "openIssues": "9",
    "unassignedIssues": "0"
  },
  "TCalc — Local-First AI Coding Context & Token Intelligence Toolkit": {
    "tags": [
      "TypeScript",
      "LLM Context",
      "Tokenization",
      "MCP",
      "AI Tools"
    ],
    "category": "Developer Tools & Productivity",
    "iconType": "calculator",
    "accentColor": "#8b5cf6",
    "mockupDescription": "Local-first developer toolkit for analyzing repository token footprints, generating smart repo maps, optimizing model context windows, and integrating with Cursor, Claude Code, and MCP.",
    "stars": "15",
    "forks": "16",
    "openIssues": "35",
    "unassignedIssues": "2"
  },
  "TCalc": {
    "tags": [
      "TypeScript",
      "LLM Context",
      "Tokenization",
      "MCP",
      "AI Tools"
    ],
    "category": "Developer Tools & Productivity",
    "iconType": "calculator",
    "accentColor": "#8b5cf6",
    "mockupDescription": "Local-first developer toolkit for analyzing repository token footprints, generating smart repo maps, optimizing model context windows, and integrating with Cursor, Claude Code, and MCP.",
    "stars": "15",
    "forks": "16",
    "openIssues": "35",
    "unassignedIssues": "2"
  },
  "Advanced Discord Bot": {
    "tags": [
      "JavaScript",
      "Node.js",
      "Discord.js",
      "Gemini AI",
      "Bot",
      "Gaming"
    ],
    "category": "Developer Tools & Productivity",
    "iconType": "sparkles",
    "accentColor": "#5865F2",
    "mockupDescription": "Feature-rich, community-focused Discord bot featuring Google Gemini AI conversation, automated moderation, interactive mini-games, dynamic XP leveling, and custom server plugins.",
    "stars": "0",
    "forks": "0",
    "openIssues": "35",
    "unassignedIssues": "15"
  },
  "LixBlogs": {
    "tags": [
      "JavaScript",
      "Next.js",
      "Cloudflare",
      "Blogging",
      "Edge Computing"
    ],
    "category": "Mobile & Web",
    "iconType": "layers",
    "accentColor": "#38bdf8",
    "mockupDescription": "Ultra-clean, modern publishing platform and markdown developer blogging engine built on Cloudflare edge workers, D1 databases, and Next.js for high-speed technical storytelling.",
    "stars": "10",
    "forks": "10",
    "openIssues": "21",
    "unassignedIssues": "5"
  },
  "CIVICFIX": {
    "tags": [
      "JavaScript",
      "CivicTech",
      "Citizen Portal",
      "Public Safety",
      "Municipal"
    ],
    "category": "AI & Public Safety / CivicTech",
    "iconType": "shield",
    "accentColor": "#10b981",
    "mockupDescription": "Crowdsourced civic grievance reporting portal connecting citizens with municipal authorities for tracking potholes, sanitation, water shortages, and public infrastructure repairs.",
    "stars": "2",
    "forks": "5",
    "openIssues": "9",
    "unassignedIssues": "0"
  },
  "CivicFix": {
    "tags": [
      "JavaScript",
      "CivicTech",
      "Citizen Portal",
      "Public Safety",
      "Municipal"
    ],
    "category": "AI & Public Safety / CivicTech",
    "iconType": "shield",
    "accentColor": "#10b981",
    "mockupDescription": "Crowdsourced civic grievance reporting portal connecting citizens with municipal authorities for tracking potholes, sanitation, water shortages, and public infrastructure repairs.",
    "stars": "2",
    "forks": "5",
    "openIssues": "9",
    "unassignedIssues": "0"
  },
  "OpenHire": {
    "tags": [
      "Python",
      "Recruitment",
      "Open Source Hiring",
      "Career",
      "Developer Jobs"
    ],
    "category": "EdTech & Career Pathways",
    "iconType": "box",
    "accentColor": "#f43f5e",
    "mockupDescription": "Transparent, open-source technical recruitment platform that matches candidates directly with engineering teams through verified skills, portfolio benchmarks, and fair assessment.",
    "stars": "3",
    "forks": "3",
    "openIssues": "0",
    "unassignedIssues": "0"
  }
};

export default async function ProjectsPage() {
  const rawProjects = await getProjects();

  // Fetch viewer profile for Navbar
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  let viewerProfile = null;

  if (currentUser) {
    let ownProfile: Record<string, unknown> | null = null;
    const { data: byUserId } = await admin
      .from("profiles")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    ownProfile = byUserId;

    if (!ownProfile) {
      const { data: byId } = await admin
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();
      if (byId) ownProfile = byId;
    }

    const gh =
      (ownProfile?.github as string) ||
      (currentUser.user_metadata?.user_name as string) ||
      (currentUser.user_metadata?.preferred_username as string) ||
      null;

    const fn =
      (ownProfile?.full_name as string) ||
      (currentUser.user_metadata?.full_name as string) ||
      (currentUser.user_metadata?.name as string) ||
      gh ||
      "Contributor";

    const av =
      (ownProfile?.avatar_url as string) ||
      (currentUser.user_metadata?.avatar_url as string) ||
      (currentUser.user_metadata?.picture as string) ||
      (gh ? `https://avatars.githubusercontent.com/${gh}` : null);

    const r = (ownProfile?.role as string) || (currentUser.user_metadata?.role as string) || "contributor";

    viewerProfile = {
      id: (ownProfile?.user_id as string) || (ownProfile?.id as string) || currentUser.id,
      name: fn,
      email: currentUser.email || "",
      avatar: av,
      role: r,
      isAdmin: r === "admin",
      isProjectAdmin: r === "project-admin",
      github: gh,
    };
  }

  // Enrich raw projects with tags, category, custom icon, and mockup attributes
  const enrichedProjects: ProjectData[] = rawProjects.map((p) => {
    // Lookup metadata by exact title or partial match
    let meta = PROJECT_META_MAP[p.title];
    if (!meta) {
      const entry = Object.entries(PROJECT_META_MAP).find(([key]) =>
        p.title.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(p.title.toLowerCase())
      );
      if (entry) meta = entry[1];
    }

    const defaultTags = p.language ? [p.language] : ["Open Source"];

    // Prioritize real database stars/forks if available (> 0), else use meta map
    const dbStars = p.stars && p.stars !== "0" ? p.stars : null;
    const dbForks = p.forks && p.forks !== "0" ? p.forks : null;
    const dbOpenIssues = p.openIssues && p.openIssues !== "0" ? p.openIssues : null;
    const dbUnassigned = p.unassignedIssues && p.unassignedIssues !== "0" ? p.unassignedIssues : null;

    return {
      id: p.id,
      title: p.title,
      description: meta?.mockupDescription || p.description,
      githubUrl: p.githubUrl,
      language: p.language,
      accentColor: meta?.accentColor || p.accentColor || "#FF7518",
      stars: dbStars || meta?.stars || p.stars || "0",
      forks: dbForks || meta?.forks || p.forks || "0",
      openIssues: dbOpenIssues || meta?.openIssues || p.openIssues || "0",
      unassignedIssues: dbUnassigned || meta?.unassignedIssues || p.unassignedIssues || "0",
      tags: meta?.tags || defaultTags,
      category: meta?.category || "Developer Tools & Productivity",
      iconType: meta?.iconType || "git-fork",
    };
  });

  // Always ensure Truxify is the 1st project in the directory
  enrichedProjects.sort((a, b) => {
    const isTruxifyA = a.title.toLowerCase().includes("truxify") || a.githubUrl.toLowerCase().includes("truxify");
    const isTruxifyB = b.title.toLowerCase().includes("truxify") || b.githubUrl.toLowerCase().includes("truxify");
    if (isTruxifyA && !isTruxifyB) return -1;
    if (!isTruxifyA && isTruxifyB) return 1;
    return 0;
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000000",
        backgroundImage:
          "radial-gradient(ellipse 700px 350px at 85% 10%, rgba(255, 117, 24, 0.1), transparent 75%)",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
        color: "#ffffff",
      }}
    >
      <Navbar initialProfile={viewerProfile} />
      <div style={{ height: "96px", width: "100%", flexShrink: 0 }} aria-hidden="true" />

      <main
        style={{
          margin: "0 auto",
          maxWidth: "1320px",
          width: "100%",
          paddingTop: "24px",
          paddingBottom: "96px",
          paddingLeft: "clamp(20px, 4vw, 40px)",
          paddingRight: "clamp(20px, 4vw, 40px)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ProjectsClient projects={enrichedProjects} />
      </main>

      <Footer />
    </div>
  );
}
