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
    tags: ["Flutter", "Dart", "Firebase", "AI", "Mobile"],
    category: "Mobile & Web",
    iconType: "truck",
    accentColor: "#FF7518",
    mockupDescription:
      "An open-source, broker-free freight marketplace connecting manufacturers directly with truck drivers. Features real-time tracking, secure payments, and AI-based matching.",
    stars: "30",
    forks: "137",
    openIssues: "1074",
    unassignedIssues: "655",
  },
  "Customer Segmentation and Churn Prediction": {
    tags: ["Python", "Machine Learning", "Data Science"],
    category: "Machine Learning / AI",
    iconType: "chart",
    accentColor: "#a855f7",
    mockupDescription:
      "An end-to-end Machine Learning pipeline that identifies customer behavior patterns and predicts churn risks using clustering and classification models.",
    stars: "6",
    forks: "20",
    openIssues: "16",
    unassignedIssues: "16",
  },
  "AdapTQ": {
    tags: ["C++", "Systems", "LLM", "AI"],
    category: "Systems & Low Level",
    iconType: "cpu",
    accentColor: "#10b981",
    mockupDescription:
      "A production-grade C++17 KV cache quantization engine for LLM inference on edge and memory-constrained systems.",
    stars: "6",
    forks: "12",
    openIssues: "4",
    unassignedIssues: "4",
  },
  "Bolcap": {
    tags: ["Python", "AI/ML", "NLP"],
    category: "Video & Media",
    iconType: "video",
    accentColor: "#ef4444",
    mockupDescription:
      "An AI-powered video captioning system supporting Hinglish with Whisper, custom transcription, and animated captions.",
    stars: "1",
    forks: "5",
    openIssues: "7",
    unassignedIssues: "7",
  },
  "Air Quality Intelligence Platform": {
    tags: ["Python", "Data Engineering", "IoT", "Analytics"],
    category: "Environmental & IoT",
    iconType: "leaf",
    accentColor: "#10b981",
    mockupDescription:
      "A real-time air quality monitoring and forecasting platform using sensor data and ML models. Built for cleaner, healthier communities.",
    stars: "3",
    forks: "13",
    openIssues: "12",
    unassignedIssues: "1",
  },
  "EcoVision": {
    tags: ["Python", "Computer Vision", "Sustainability"],
    category: "Environmental & IoT",
    iconType: "eye",
    accentColor: "#3b82f6",
    mockupDescription:
      "An AI-based environmental monitoring project to identify waste, track pollution and promote cleaner surroundings through computer vision.",
    stars: "5",
    forks: "9",
    openIssues: "4",
    unassignedIssues: "4",
  },
  "SecureFlow": {
    tags: ["TypeScript", "GitHub", "Security", "AI"],
    category: "Security & DevSecOps",
    iconType: "lock",
    accentColor: "#8b5cf6",
    mockupDescription:
      "A security analysis platform for GitHub pull requsets using LLMs. Detects vulnerabilities and suggests fixes.",
    stars: "5",
    forks: "56",
    openIssues: "10",
    unassignedIssues: "0",
  },
  "LawSaathi-RAG": {
    tags: ["Python", "RAG", "NLP", "AI"],
    category: "Machine Learning / AI",
    iconType: "scale",
    accentColor: "#f59e0b",
    mockupDescription:
      "An Indian legal RAG system for question answering with BM25, dense retrieval and reproducible evaluation.",
    stars: "3",
    forks: "8",
    openIssues: "8",
    unassignedIssues: "8",
  },
  "AI Product Factory": {
    tags: ["TypeScript", "AI Agents", "Productivity"],
    category: "Developer Tools & Productivity",
    iconType: "box",
    accentColor: "#ec4899",
    mockupDescription:
      "An open-source agentic platform to turn ideas into production-ready products with AI.",
    stars: "0",
    forks: "7",
    openIssues: "2",
    unassignedIssues: "1",
  },
  "CreatorOS": {
    tags: ["JavaScript", "React", "Next.js", "Analytics"],
    category: "Mobile & Web",
    iconType: "layout",
    accentColor: "#f43f5e",
    mockupDescription:
      "CreatorOS is an open-source all-in-one dashboard for creators to manage their business from a single platform.",
    stars: "37",
    forks: "72",
    openIssues: "13",
    unassignedIssues: "4",
  },
  "AI Stock Analyzer": {
    tags: ["Python", "Flask", "Machine Learning", "FinTech"],
    category: "Data Science & Analytics",
    iconType: "trending-up",
    accentColor: "#14b8a6",
    mockupDescription:
      "A web-based stock analysis application providing interactive stock visualizations and machine learning models for stock price prediction.",
    stars: "36",
    forks: "99",
    openIssues: "9",
    unassignedIssues: "9",
  },
  "Dockfleet": {
    tags: ["Python", "Docker", "DevOps", "Containers"],
    category: "Developer Tools & Productivity",
    iconType: "server",
    accentColor: "#0284c7",
    mockupDescription:
      "A free and open-source, local-first orchestration tool that helps developers run and manage multiple projects on a single VPS using Docker.",
    stars: "11",
    forks: "13",
    openIssues: "2",
    unassignedIssues: "0",
  },
  "AtomicBinding": {
    tags: ["TypeScript", "CMS", "GraphQL", "Documentation"],
    category: "Developer Tools & Productivity",
    iconType: "layers",
    accentColor: "#06b6d4",
    mockupDescription:
      "A dual-source content platform where documentation lives in Git while app content is managed via a CMS into a single typed content graph.",
    stars: "2",
    forks: "3",
    openIssues: "5",
    unassignedIssues: "0",
  },
  "JugaadLang": {
    tags: ["Python", "Compiler", "Language Design"],
    category: "Systems & Low Level",
    iconType: "terminal",
    accentColor: "#f97316",
    mockupDescription:
      "A modern programming language designed with Hindi keywords for Indian developers, providing a familiar native terminology coding experience.",
    stars: "17",
    forks: "29",
    openIssues: "4",
    unassignedIssues: "0",
  },
  "WalletWise": {
    tags: ["JavaScript", "FinTech", "Analytics", "React"],
    category: "Mobile & Web",
    iconType: "wallet",
    accentColor: "#10b981",
    mockupDescription:
      "A comprehensive financial guidance platform combining behavioral insights, predictive analytics, and real-time financial advisory.",
    stars: "25",
    forks: "77",
    openIssues: "101",
    unassignedIssues: "19",
  },
  "TCalc — AI Coding Context & Token Intelligence Toolkit": {
    tags: ["TypeScript", "AI Context", "LLM", "MCP"],
    category: "Developer Tools & Productivity",
    iconType: "calculator",
    accentColor: "#8b5cf6",
    mockupDescription:
      "An open-source developer toolkit for understanding and optimizing AI coding context and token usage across LLM editors and MCP clients.",
    stars: "7",
    forks: "7",
    openIssues: "2",
    unassignedIssues: "2",
  },
  "Nari shield": {
    tags: ["Python","React","Flask","Firebase","AI/ML","Women Safety"],
    category: "AI & Public Safety / CivicTech",
    iconType: "shield",
    accentColor: "#ec4899",
    mockupDescription: "NariShield is an AI-powered women safety solution designed to provide quick assistance during unsafe situations through SOS alerts, emergency contact notifications, location sharing, and intelligent safety assistance.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "Smart Prompt – AI-Powered Prompt Enhancement Chrome Extension": {
    tags: ["JavaScript","Chrome Extension","Generative AI","LLM","Prompt Engineering"],
    category: "Browser Extensions & Generative AI Tools",
    iconType: "sparkles",
    accentColor: "#f59e0b",
    mockupDescription: "An AI-powered Chrome Extension that enhances user prompts before they are submitted to AI platforms like ChatGPT, Claude, and Gemini with intelligent optimization, persona-based engineering, and cross-platform synchronization.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "NetShield Network Monitoring": {
    tags: ["Python","FastAPI","React","Vite","Cybersecurity","Network Monitoring"],
    category: "Cybersecurity & Network Infrastructure",
    iconType: "server",
    accentColor: "#06b6d4",
    mockupDescription: "A network monitoring and security operations dashboard providing real-time packet/traffic analytics, alerting, and JWT-authenticated session monitoring.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "HALO": {
    tags: ["Next.js","TypeScript","DePIN","Telecom","Web3","WireGuard"],
    category: "DePIN, Telecom & Web3",
    iconType: "cpu",
    accentColor: "#8b5cf6",
    mockupDescription: "HALO makes connectivity adaptive, intelligent, and privacy-focused combining decentralized networks, eSIMs, and VPN technologies.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "LifeOS-AI": {
    tags: ["React","Python","FastAPI","Flask","AI Assistants","Productivity"],
    category: "Productivity & AI Assistants",
    iconType: "brain",
    accentColor: "#10b981",
    mockupDescription: "An intelligent agent system that proactively queries users about pending schedule tasks, reminders, and daily commitments rather than requiring manual calendar scheduling.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "DevMomentum": {
    tags: ["JavaScript","HTML5","CSS3","Firebase","Productivity","EdTech"],
    category: "EdTech & Productivity Tools",
    iconType: "trending-up",
    accentColor: "#3b82f6",
    mockupDescription: "A data-driven placement-preparation planner that helps users organize daily tasks, track progress, manage study roadmaps, and monitor XP levels, streaks, and analytics.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "FinAssist-AI": {
    tags: ["React","TailwindCSS","Node.js","Express","MongoDB","Gemini AI","FinTech"],
    category: "FinTech & Conversational AI",
    iconType: "wallet",
    accentColor: "#10b981",
    mockupDescription: "An intelligent conversational financial assistant and fraud detection chatbot built on top of Google Gemini AI and the MERN stack.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "JARVIS": {
    tags: ["Python","Tkinter","Autonomous Agents","Automation","Desktop"],
    category: "Automation & Desktop Agents",
    iconType: "cpu",
    accentColor: "#0284c7",
    mockupDescription: "A desktop-based autonomous agent system designed to execute automated computer actions and desktop assistance.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "Bank interest calculation system": {
    tags: ["C","JavaScript","HTML","CSS","FinTech","Banking"],
    category: "Systems Programming & Core Logic",
    iconType: "terminal",
    accentColor: "#64748b",
    mockupDescription: "A foundational software project simulating core banking calculations, loan computations, and interest rate distribution logic.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "Ecommerce -website": {
    tags: ["React","Python","Django","Django REST","SQLite","Razorpay","E-Commerce"],
    category: "E-Commerce & Full Stack Web",
    iconType: "layout",
    accentColor: "#f97316",
    mockupDescription: "An end-to-end full-stack e-commerce application featuring JWT authentication, category browsing, cart checkout flows, and Razorpay integration.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "Jaldiwale": {
    tags: ["JavaScript","Node.js","Express","MongoDB","React","Marketplace"],
    category: "Marketplace & Services Platforms",
    iconType: "truck",
    accentColor: "#eab308",
    mockupDescription: "An on-demand home and local services marketplace web application connecting consumers with skilled service providers.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "Agni AI": {
    tags: ["React","Three.js","React Three Fiber","TailwindCSS","Node.js","Gemini AI","3D Visualization"],
    category: "3D Graphics & Architecture AI",
    iconType: "box",
    accentColor: "#f43f5e",
    mockupDescription: "An interactive 3D architectural visualization and interior design platform combining modern design with traditional Indian Vastu guidelines.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "WireForge": {
    tags: ["Rust","Ratatui","TUI","Accessibility","Wireframing"],
    category: "Terminal Applications & Accessibility Tools",
    iconType: "terminal",
    accentColor: "#dea584",
    mockupDescription: "A Braille wireframe viewer and terminal user interface (TUI) editor created in Rust using the Ratatui framework.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "Innovision": {
    tags: ["React.js","Next.js","Express.js","Node.js","Firebase","EdTech","AI/ML"],
    category: "EdTech & Personalized Learning",
    iconType: "brain",
    accentColor: "#38bdf8",
    mockupDescription: "An AI-powered adaptive learning platform that dynamically generates structured, personalized curriculum and courses on demand for any topic.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "FinSight - Personal Finance & Investment Tracker": {
    tags: ["TypeScript","React","Node.js","Express","MongoDB","OCR","FinTech"],
    category: "FinTech & Financial Analytics",
    iconType: "wallet",
    accentColor: "#10b981",
    mockupDescription: "A comprehensive personal finance tracking dashboard featuring automated SIP analysis, AI forecasting, receipt OCR, and investment portfolio management.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "KL-eats (food pre-ordering system)": {
    tags: ["Java","Spring Boot","MySQL","REST API","HTML/CSS","FoodTech"],
    category: "FoodTech & Campus Services",
    iconType: "layout",
    accentColor: "#f59e0b",
    mockupDescription: "A campus and community-oriented food pre-ordering and discovery platform enabling students to explore menus, pre-order meals, and minimize dining wait times.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "DNA sequence matching": {
    tags: ["Java","Spring Boot","Bioinformatics","NCBI","Algorithms","DNA Analysis"],
    category: "Bioinformatics & Computational Biology",
    iconType: "cpu",
    accentColor: "#8b5cf6",
    mockupDescription: "A bioinformatics software application built to compare DNA sequences, perform nucleotide pattern matching, and process NCBI biological datasets.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "LinkedIn Clone (Microservice Architecture)": {
    tags: ["Java","Spring Boot","Neo4j","Apache Kafka","Docker","Microservices"],
    category: "Microservices Architecture & Distributed Systems",
    iconType: "layers",
    accentColor: "#0284c7",
    mockupDescription: "A distributed microservices professional social network system utilizing Neo4j graph databases for modeling connection degrees and Apache Kafka for event-driven message queuing.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "Telecom Churn prediction": {
    tags: ["Python","Pandas","NumPy","Scikit-Learn","Machine Learning","Customer Churn"],
    category: "Machine Learning & Customer Analytics",
    iconType: "chart",
    accentColor: "#ec4899",
    mockupDescription: "Supervised classification machine learning model pipeline to detect and predict churn probabilities among telecom subscribers using feature engineering and demographic analytics.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "Scout": {
    tags: ["Next.js","TypeScript","TailwindCSS","Fastify","Prisma","PostgreSQL","Multi-Agent AI"],
    category: "Agentic AI & Autonomous Research",
    iconType: "brain",
    accentColor: "#6366f1",
    mockupDescription: "An open-source multi-agent intelligence and research workspace that orchestrates specialized AI agents to investigate complex queries, evaluate sources, and verify facts.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "Customer Churn Prediction (XGBoost)": {
    tags: ["Python","Scikit-Learn","XGBoost","Pandas","Customer Analytics","Data Science"],
    category: "Data Science & Business Intelligence",
    iconType: "chart",
    accentColor: "#14b8a6",
    mockupDescription: "An end-to-end customer churn classification solution leveraging XGBoost and scikit-learn models to identify retention risks across customer cohorts.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "e-commerce style wardobe": {
    tags: ["TypeScript","HTML","CSS","E-Commerce","Responsive Design","UI/UX"],
    category: "E-Commerce & Frontend Engineering",
    iconType: "layout",
    accentColor: "#f43f5e",
    mockupDescription: "A TypeScript-based apparel e-commerce web platform offering granular category-based filtering, collections, and responsive checkout interfaces.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "Rai": {
    tags: ["React","TypeScript","Vite","TailwindCSS","Node.js","Express","Gemini AI","MongoDB"],
    category: "Productivity & Web Applications",
    iconType: "sparkles",
    accentColor: "#a855f7",
    mockupDescription: "An AI-powered lifestyle and productivity assistant providing contextual scheduling, intelligent suggestions, and full-stack task organization.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "VedEngine-Pro": {
    tags: ["React","JavaScript","TailwindCSS","Fastify","Supabase","Search Engine"],
    category: "Search & Information Retrieval",
    iconType: "server",
    accentColor: "#38bdf8",
    mockupDescription: "A lightweight custom web search and aggregation engine focused on fast indexed content discovery and developer-friendly querying.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "PBTW — Pappu Bhai Tanker Wale": {
    tags: ["TypeScript","React","Geolocation","Logistics","Real-Time Tracking"],
    category: "Hyper-Local Logistics & Utility Booking",
    iconType: "truck",
    accentColor: "#0284c7",
    mockupDescription: "A hyper-local logistics and booking platform specifically engineered to streamline, schedule, and track commercial water tanker deliveries.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
  "NXTpath": {
    tags: ["TypeScript","Full Stack","Career Navigation","EdTech","Roadmap"],
    category: "EdTech & Career Pathways",
    iconType: "trending-up",
    accentColor: "#10b981",
    mockupDescription: "A career roadmap and skill pathway discovery platform guiding students toward personalized technical milestones.",
    stars: "0",
    forks: "0",
    openIssues: "0",
    unassignedIssues: "0",
  },
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

  // Always place Truxify as the 1st project in the directory
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
