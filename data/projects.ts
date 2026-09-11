export interface Project {
  title: string;
  githubRepo: string;
  description?: string;
  language?: string;
  accentColor?: string;
  techStack?: string;
}

/**
 * Official competition / tracked repositories.
 * The GitHub Contribution Sync Engine checks user PRs against this list.
 */
export const PROJECTS: Project[] = [
  {
    title: "Truxify – Broker-Free Freight Marketplace",
    githubRepo: "https://github.com/KanishJebaMathewM/Truxify",
    language: "Flutter",
    accentColor: "#FF7518",
    techStack: "Flutter, Firebase, Node.js, Express.js, FastAPI, Python, scikit-learn, PyTorch, PostgreSQL, PostGIS, Supabase, MongoDB, Redis, Polygon, Solidity, WebSockets, OpenStreetMap, Leaflet, OSRM, n8n, WebRTC, Whisper, LLMs, ElevenLabs, Docker, GitHub Actions, Cloudflare R2, Render",
    description: "Truxify is an open-source, broker-free freight marketplace connecting manufacturers directly with truck drivers. It addresses broker commissions, empty return trips, inefficient truck discovery, payment delays, and limited shipment visibility through ML-powered matching, route optimization, live tracking, blockchain-based escrow, voice AI, and automation.",
  },
  {
    title: "Customer Segmentation and Churn Prediction",
    githubRepo: "https://github.com/abhaycs24/CBSOT_SIP_PROJECT-1-",
    language: "Python",
    accentColor: "#3b82f6",
    techStack: "Python, Pandas, NumPy, Scikit-Learn, K-Means, Random Forest, SimpleImputer, StandardScaler, RandomizedSearchCV, Matplotlib, Seaborn",
    description: "An end-to-end Machine Learning and Predictive Analytics pipeline that identifies customer behavior patterns and predicts churn risks. It uses K-Means clustering for customer segmentation and a Random Forest classifier for churn prediction, with model optimization and evaluation using ROC-AUC and confusion matrix analysis.",
  },
  {
    title: "AdapTQ",
    githubRepo: "https://github.com/l3tchupkt/adaptq",
    language: "C++",
    accentColor: "#a855f7",
    techStack: "Python, C++17",
    description: "AdapTQ is a production-grade C++17 KV cache quantization engine for Large Language Model inference on edge and memory-constrained systems.",
  },
  {
    title: "Bolcap",
    githubRepo: "https://github.com/AdityaPainuli/clippings-vids",
    language: "Python",
    accentColor: "#ef4444",
    techStack: "Python, TypeScript",
    description: "Bolcap is an AI-powered video captioning system featuring viral-moment clipping and a Hinglish caption engine. It uses Whisper for word-level transcription, natural Hinglish romanization, customizable animated captions, and exports burned MP4 or alpha-overlay MOV files.",
  },
  {
    title: "Air Quality Intelligence Platform",
    githubRepo: "https://github.com/AseemPrasad/Air-Quality-Intelligence",
    language: "Python",
    accentColor: "#10b981",
    techStack: "Python 3.12, PostgreSQL, Parquet, Polars, Airflow, scikit-learn, NumPy, FastAPI, Pydantic, pytest",
    description: "A local-first, open-source data engineering and analytics platform for real-time air-quality monitoring, anomaly detection, and near-term PM2.5 forecasting. It ingests data from OpenAQ and Open-Meteo, validates and processes sensor data, detects pollution anomalies, trains forecasting models, and provides results through an API and interactive dashboard.",
  },
  {
    title: "EcoVision",
    githubRepo: "https://github.com/Sushmitha-2007/Eco-vision",
    language: "Python",
    accentColor: "#22c55e",
    techStack: "Computer Vision, Python, JavaScript",
    description: "EcoVision is an AI-based environmental monitoring project that uses computer vision and data analysis to identify waste, monitor environmental conditions, and promote proper waste management. It aims to support cleaner surroundings through smart, technology-driven environmental solutions.",
  },
  {
    title: "SecureFlow",
    githubRepo: "https://github.com/GauravKarakoti/Secureflow",
    language: "TypeScript",
    accentColor: "#6366f1",
    techStack: "Next.js 15, App Router, Turbopack, PostgreSQL, Prisma ORM, NextAuth.js v5, GitHub OAuth, Groq SDK, Genkit, Octokit, Tailwind CSS, Radix UI, Recharts",
    description: "SecureFlow integrates with GitHub through a GitHub App and webhooks to analyze pull requests for security issues. Its AI engine uses Groq's Llama 3.1 to analyze code diffs and provide security findings, explanations, and remediation steps through a centralized dashboard.",
  },
  {
    title: "LawSaathi-RAG",
    githubRepo: "https://github.com/SidakSethi-Singh/LawSathi-Rag",
    language: "Python",
    accentColor: "#eab308",
    techStack: "Python, RAG, BM25, Dense Retrieval, Embeddings, LLMs, LangChain, FAISS, Chroma",
    description: "LawSaathi-RAG benchmarks different Retrieval-Augmented Generation architectures for Indian legal question answering. It evaluates retrieval approaches such as BM25 and dense retrieval to determine their effectiveness for Indian legal document QA, with reproducible code, datasets, and evaluation results.",
  },
  {
    title: "AI Product Factory",
    githubRepo: "https://github.com/logeshv586-code/AIproductfactory",
    language: "TypeScript",
    accentColor: "#ec4899",
    techStack: "React, TypeScript, Vite, Python, FastAPI, REST APIs, OpenAI, Anthropic, Gemini, NVIDIA NIM, DeepSeek, Ollama, LM Studio, GitHub Integration, Docker",
    description: "AI Product Factory is an open-source agentic platform that helps developers and non-technical founders transform product ideas into implementation-ready software projects. It connects AI models, generates evidence-backed plans, designs architectures, and coordinates specialized AI agents to generate, test, and improve applications.",
  },
  {
    title: "InnoVision",
    githubRepo: "https://github.com/ItsVikasA/Innovision-Open-Source",
    language: "JavaScript",
    accentColor: "#38bdf8",
    techStack: "React.js, Next.js, Express.js, Node.js, Firebase, Razorpay",
    description: "InnoVision is an AI-powered learning platform that dynamically generates structured and engaging courses from any topic. It aims to overcome limitations of traditional courses by providing a flexible and adaptive learning experience powered by AI and machine learning.",
  },
  {
    title: "CreatorOS",
    githubRepo: "https://github.com/aashutoshkumarbhardwaj/CreatorOs",
    language: "JavaScript",
    accentColor: "#f43f5e",
    techStack: "EJS, Node.js, Express.js, MongoDB, JWT, Automation, Social APIs",
    description: "CreatorOS is an open-source all-in-one dashboard for creators to manage their business from a single platform. It combines bio links, DM automation, CRM, analytics, and content planning, reducing the need to use multiple separate creator tools.",
  },
  {
    title: "JugaadLang",
    githubRepo: "https://github.com/JugaadLang/jugaadlang",
    language: "Python",
    accentColor: "#f97316",
    techStack: "Python, JavaScript, HTML5, CSS, VS Code Extension",
    description: "JugaadLang is a modern programming language designed with Hindi keywords for Indian developers. It provides an alternative programming experience where developers can write code using familiar Hindi terminology.",
  },
  {
    title: "AI Stock Analyzer",
    githubRepo: "https://github.com/SrigadaAkshayKumar/stock",
    language: "Python",
    accentColor: "#14b8a6",
    techStack: "Python, React, Flask, Machine Learning, NLP",
    description: "A web-based stock analysis application built with React and Flask. It provides interactive stock visualizations and uses machine learning-based techniques for stock price prediction and analysis.",
  },
  {
    title: "WalletWise",
    githubRepo: "https://github.com/SoumyaMishra-7/WalletWise",
    language: "JavaScript",
    accentColor: "#10b981",
    techStack: "JavaScript, Python, MongoDB, HTML, CSS, React, Node.js, Docker",
    description: "WalletWise is a comprehensive financial guidance platform designed to help students, early-career professionals, and other users manage their finances. Beyond basic expense tracking, it combines behavioral insights, predictive analytics, and real-time financial advisory features to help users make better financial decisions.",
  },
  {
    title: "Dockfleet",
    githubRepo: "https://github.com/pratyushjha06/Dockfleet",
    language: "Python",
    accentColor: "#0284c7",
    techStack: "Python, FastAPI, Docker, SQLite, Alpine.js, Tailwind CSS, Typer",
    description: "Dockfleet is a free and open-source, local-first orchestration tool that helps solo developers and small teams run and manage multiple projects on a single machine or VPS using Docker containers.",
  },
  {
    title: "TCalc — AI Coding Context & Token Intelligence Toolkit",
    githubRepo: "https://github.com/Sandesh13fr/TCalc",
    language: "TypeScript",
    accentColor: "#8b5cf6",
    techStack: "TypeScript, Node.js, pnpm, Next.js, React, VS Code Extension API, Model Context Protocol (MCP), Commander.js, JetBrains IntelliJ Platform, JSON/Markdown, GitHub Actions",
    description: "TCalc is an open-source, local-first developer toolkit for understanding and optimizing AI coding context and token usage. It analyzes repositories, estimates token consumption, identifies token-heavy files, recommends AI models, estimates context fit and cost, generates repository maps, and integrates with tools such as Cursor, Claude Code, Continue, Cline, Roo, and MCP-compatible clients while keeping source code local.",
  },
  {
    title: "AtomicBinding",
    githubRepo: "https://github.com/SrishtiSonam/AtomicBinding",
    language: "TypeScript",
    accentColor: "#06b6d4",
    techStack: "Next.js 15, React 19, TypeScript, Zod, Node.js 22+, SQLite, PostgreSQL, Git",
    description: "AtomicBinding is a dual-source content platform where documentation lives in Git while application content is managed through a custom CMS. Both sources are normalized into a single typed content graph consumed by one frontend, with six build gates providing validation and quality control between the content graph and production.",
  },
];

/**
 * Helper to extract unique lowercase "owner/repo" strings for matching.
 */
export function getAllowedRepoSlugs(): Set<string> {
  const slugs = new Set<string>();

  for (const project of PROJECTS) {
    const slug = extractRepoSlug(project.githubRepo);
    if (slug) {
      slugs.add(slug.toLowerCase());
    }
  }

  // Explicitly ensure official organizations are included
  slugs.add("open-source-connect-01/osc-india");
  slugs.add("open-source-connect-01/open-source-connect");
  slugs.add("phicsit-community/oscg_old_website");

  return slugs;
}

/**
 * Checks if a repository slug is tracked for contributions
 */
export function isAllowedRepoSlug(slug: string): boolean {
  if (!slug) return false;
  const lower = slug.toLowerCase();
  const allowed = getAllowedRepoSlugs();
  return (
    allowed.has(lower) ||
    lower.startsWith("open-source-connect-01/") ||
    lower.startsWith("osc-india/")
  );
}

export function extractRepoSlug(url: string): string | null {
  if (!url) return null;
  const match = url.match(/github\.com\/([^\/]+\/[^\/\s#?]+)/i);
  return match ? match[1].replace(/\.git$/i, "") : null;
}
