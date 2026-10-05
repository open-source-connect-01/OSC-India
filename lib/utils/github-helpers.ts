export type DifficultyLevel = "easy" | "medium" | "hard" | "expert";

export const DIFFICULTY_POINTS: Record<DifficultyLevel, number> = {
  easy: 10,
  medium: 20,
  hard: 30,
  expert: 50,
};



export const DIFFICULTY_RANK: Record<DifficultyLevel, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  expert: 4,
};

/**
 * Official open source competition repository URLs.
 * Contributions are strictly calculated ONLY from PRs merged into these repositories.
 */
export const OFFICIAL_COMPETITION_REPOS = [
  "https://github.com/KanishJebaMathewM/Truxify",
  "https://github.com/AditthyaSS/iloveAgents",
  "https://github.com/l3tchupkt/adaptq",
  "https://github.com/AdityaPainuli/clippings-vids",
  "https://github.com/Canopus-Labs/PrepPilot",
  "https://github.com/AseemPrasad/Air-Quality-Intelligence",
  "https://github.com/GauravKarakoti/Secureflow",
  "https://github.com/logeshv586-code/AIproductfactory",
  "https://github.com/harshalkurrey/Harshal-World",
  "https://github.com/vishnukothakapu/linkid",
  "https://github.com/Aharshi3614/Devwhisper",
  "https://github.com/Harsh-vardhan09/AthLead",
  "https://github.com/SatyamPandey-07/WorkSphere",
  "https://github.com/Jyatin/KiranaWala",
  "https://github.com/10-Mohan/Trafitech",
  "https://github.com/aashutoshkumarbhardwaj/CreatorOs",
  "https://github.com/Harshbansal8705/DesktopAI",
  "https://github.com/JugaadLang/jugaadlang",
  "https://github.com/SrigadaAkshayKumar/stock",
  "https://github.com/IIXII-L192/PocketOps-app",
  "https://github.com/SoumyaMishra-7/WalletWise",
  "https://github.com/YTxFSGAMERz/WinAurex",
  "https://github.com/AnthropicBots/hiero-bot-py",
  "https://github.com/pratyushjha06/Dockfleet",
  "https://github.com/Sandesh13fr/TCalc",
  "https://github.com/AdvancedDiscordBot/Advanced-Discord-Bot",
  "https://github.com/elixpo/blogs.elixpo",
  "https://github.com/Janani-bn/CivicFix",
  "https://github.com/DevSidd2006/openhire",
] as const;

/**
 * Normalized lowercase "owner/repo" slugs for all official competition repositories.
 */
export const OFFICIAL_COMPETITION_REPO_SLUGS = new Set([
  "kanishjebamathewm/truxify",
  "aditthyass/iloveagents",
  "l3tchupkt/adaptq",
  "adityapainuli/clippings-vids",
  "canopus-labs/preppilot",
  "aseemprasad/air-quality-intelligence",
  "gauravkarakoti/secureflow",
  "logeshv586-code/aiproductfactory",
  "harshalkurrey/harshal-world",
  "vishnukothakapu/linkid",
  "aharshi3614/devwhisper",
  "harsh-vardhan09/athlead",
  "satyampandey-07/worksphere",
  "jyatin/kiranawala",
  "10-mohan/trafitech",
  "aashutoshkumarbhardwaj/creatoros",
  "harshbansal8705/desktopai",
  "jugaadlang/jugaadlang",
  "srigadaakshaykumar/stock",
  "iixii-l192/pocketops-app",
  "soumyamishra-7/walletwise",
  "ytxfsgamerz/winaurex",
  "anthropicbots/hiero-bot-py",
  "pratyushjha06/dockfleet",
  "sandesh13fr/tcalc",
  "advanceddiscordbot/advanced-discord-bot",
  "elixpo/blogs.elixpo",
  "janani-bn/civicfix",
  "devsidd2006/openhire",
]);

/**
 * Official Project Admin Registrations from the official registration sheet.
 */
export interface ProjectAdminRegistration {
  email: string;
  name: string;
  github: string;
  repos: string[];
}

export const OFFICIAL_PROJECT_ADMIN_REGISTRATIONS: ProjectAdminRegistration[] = [
  {
    email: "kanishjebamathew.m@gmail.com",
    name: "Kanish Jeba Mathew M",
    github: "kanishjebamathewm",
    repos: ["kanishjebamathewm/truxify"],
  },
  {
    email: "aditthyassdeepa@gmail.com",
    name: "Aditthya SS Varma",
    github: "aditthyass",
    repos: ["aditthyass/iloveagents", "aditthyass/taba"],
  },
  {
    email: "dfpkt96@gmail.com",
    name: "Lakshmikanthan k",
    github: "l3tchupkt",
    repos: ["l3tchupkt/adaptq", "l3tchupkt/bugpilot"],
  },
  {
    email: "adityapainuli2004@gmail.com",
    name: "Aditya Painuli",
    github: "adityapainuli",
    repos: ["adityapainuli/clippings-vids", "adityapainuli/retra"],
  },
  {
    email: "karanunique36@gmail.com",
    name: "Karan Manickam",
    github: "canopus-labs",
    repos: ["canopus-labs/preppilot", "canopus-labs/canopus-org"],
  },
  {
    email: "aseemprasad0520@gmail.com",
    name: "Aseem Prasad",
    github: "aseemprasad",
    repos: ["aseemprasad/air-quality-intelligence"],
  },
  {
    email: "karakotigaurav12@gmail.com",
    name: "Gaurav Karakoti",
    github: "gauravkarakoti",
    repos: ["gauravkarakoti/secureflow", "gauravkarakoti/temporal-modelling"],
  },
  {
    email: "logesh@psgbiz.com",
    name: "Logesh V",
    github: "logeshv586-code",
    repos: ["logeshv586-code/aiproductfactory", "logeshv586-code/aitradra"],
  },
  {
    email: "rahulkurrey321@gmail.com",
    name: "Harshal",
    github: "harshalkurrey",
    repos: ["harshalkurrey/harshal-world", "harshalkurrey/campuscare"],
  },
  {
    email: "kothakapuvishnukiran@gmail.com",
    name: "Kothakapu Vishnu Kiran",
    github: "vishnukothakapu",
    repos: ["vishnukothakapu/linkid"],
  },
  {
    email: "aharshisinha2020@gmail.com",
    name: "Aharshi Sinha",
    github: "aharshi3614",
    repos: ["aharshi3614/devwhisper"],
  },
  {
    email: "harsh.vardhanp0901@gmail.com",
    name: "harsh vardhan",
    github: "harsh-vardhan09",
    repos: ["harsh-vardhan09/athlead", "harsh-vardhan09/otp-autofiller-extension"],
  },
  {
    email: "pandeysatyam1802@gmail.com",
    name: "Satyam Pandey",
    github: "satyampandey-07",
    repos: ["satyampandey-07/worksphere", "satyampandey-07/study-buddy-ai"],
  },
  {
    email: "singhjyatin@gmail.com",
    name: "Jyatin Kumar Singh",
    github: "jyatin",
    repos: ["jyatin/kiranawala", "jyatin/askpdf"],
  },
  {
    email: "mohan191024@gmail.com",
    name: "Mohan Kumbar",
    github: "10-mohan",
    repos: ["10-mohan/trafitech", "10-mohan/eventscope"],
  },
  {
    email: "ashutoshkumarbhardwaj7@gmail.com",
    name: "Aashutosh kumar bhardwaj",
    github: "aashutoshkumarbhardwaj",
    repos: ["aashutoshkumarbhardwaj/creatoros"],
  },
  {
    email: "harshbansal8705@gmail.com",
    name: "Harsh Bansal",
    github: "harshbansal8705",
    repos: ["harshbansal8705/desktopai", "harshbansal8705/frost-app"],
  },
  {
    email: "sumangalkaran44@gmail.com",
    name: "Sumangal karan",
    github: "jugaadlang",
    repos: ["jugaadlang/jugaadlang"],
  },
  {
    email: "srigadaakshay@gmail.com",
    name: "Akshay Kumar",
    github: "srigadaakshaykumar",
    repos: ["srigadaakshaykumar/stock"],
  },
  {
    email: "192aakarsh@gmail.com",
    name: "Aakarsh Singhal",
    github: "iixii-l192",
    repos: ["iixii-l192/pocketops-app"],
  },
  {
    email: "soumyamishra788@gmail.com",
    name: "Soumya Mishra",
    github: "soumyamishra-7",
    repos: ["soumyamishra-7/walletwise", "soumyamishra-7/nirogai"],
  },
  {
    email: "f98561965@gmail.com",
    name: "Farhan Shaikh",
    github: "ytxfsgamerz",
    repos: ["ytxfsgamerz/winaurex"],
  },
  {
    email: "bhuvanshkataria@gmail.com",
    name: "Bhuvansh",
    github: "anthropicbots",
    repos: ["anthropicbots/hiero-bot-py", "anthropicbots/issuescout"],
  },
  {
    email: "pratyushjha06@gmail.com",
    name: "Pratyush Jha",
    github: "pratyushjha06",
    repos: ["pratyushjha06/dockfleet"],
  },
  {
    email: "sandeshdawkhar13@gmail.com",
    name: "Sandesh Prakash Dawkhar",
    github: "sandesh13fr",
    repos: ["sandesh13fr/tcalc"],
  },
  {
    email: "gollabharath2007@gmail.com",
    name: "Golla Bharath",
    github: "advanceddiscordbot",
    repos: ["advanceddiscordbot/advanced-discord-bot"],
  },
  {
    email: "vivektalent200@gmail.com",
    name: "Vivek Yadav",
    github: "elixpo",
    repos: ["elixpo/blogs.elixpo"],
  },
  {
    email: "bnjanani258@gmail.com",
    name: "Janani B N",
    github: "janani-bn",
    repos: ["janani-bn/temp_civic"],
  },
  {
    email: "kushwahasiddhartha31@gmail.com",
    name: "Siddhartha Kushwaha",
    github: "devsidd2006",
    repos: ["devsidd2006/openhire"],
  },
];

/**
 * Set of all 29 official Project Admin email addresses (lowercase).
 */
export const OFFICIAL_PROJECT_ADMIN_EMAILS = new Set<string>(
  OFFICIAL_PROJECT_ADMIN_REGISTRATIONS.map((r) => r.email.toLowerCase())
);

/**
 * Mapping from project admin email (lowercase) to their managed repo slugs.
 */
export const PROJECT_ADMIN_REPO_MAP_BY_EMAIL: Record<string, string[]> = Object.fromEntries(
  OFFICIAL_PROJECT_ADMIN_REGISTRATIONS.map((r) => [r.email.toLowerCase(), r.repos])
);

/**
 * Official Project Admin GitHub handles mapped to repository patterns.
 */
export const OFFICIAL_PROJECT_ADMIN_HANDLES = new Set([
  "kanishjebamathewm",
  "aditthyass",
  "l3tchupkt",
  "adityapainuli",
  "canopus-labs",
  "karanunix",
  "aseemprasad",
  "gauravkarakoti",
  "logeshv586-code",
  "harshalkurrey",
  "vishnukothakapu",
  "aharshi3614",
  "harsh-vardhan09",
  "satyampandey-07",
  "jyatin",
  "10-mohan",
  "aashutoshkumarbhardwaj",
  "harshbansal8705",
  "jugaadlang",
  "srigadaakshaykumar",
  "iixii-l192",
  "soumyamishra-7",
  "ytxfsgamerz",
  "anthropicbots",
  "bhuvansh855",
  "pratyushjha06",
  "sandesh13fr",
  "advanceddiscordbot",
  "elixpo",
  "janani-bn",
  "devsidd2006",
]);

/**
 * Validates whether an email belongs to an official project admin.
 */
export function isOfficialProjectAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return OFFICIAL_PROJECT_ADMIN_EMAILS.has(email.trim().toLowerCase());
}

/**
 * Validates whether a GitHub handle belongs to an official project admin.
 */
export function isOfficialProjectAdminHandle(handle?: string | null): boolean {
  if (!handle) return false;
  const clean = handle.replace(/^@+/, "").trim().toLowerCase();
  return OFFICIAL_PROJECT_ADMIN_HANDLES.has(clean);
}

/**
 * Validates whether a given repo slug or URL is an official competition repository.
 */
export function isAllowedCompetitionRepo(repoSlugOrUrl?: string | null): boolean {
  if (!repoSlugOrUrl) return false;
  const slug = extractRepoSlug(repoSlugOrUrl);
  return Boolean(slug && OFFICIAL_COMPETITION_REPO_SLUGS.has(slug));
}

/**
 * Normalizes a GitHub handle or URL into a clean username
 */
export function normalizeGitHubHandle(handle: string): string {
  if (!handle) return "";
  return handle
    .trim()
    .replace(/^@+/, "")
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\/+$/, "")
    .trim();
}

/**
 * Returns whether an issue or PR has the official competition label (OSCI'26 / OSCI26).
 */
export function hasOsci26Label(item?: { labels?: Array<{ name: string } | string> } | null): boolean {
  if (!item) return false;
  const labels = item.labels || [];
  return labels.some((l) => {
    const name = (typeof l === "string" ? l : l.name || "").toLowerCase().trim();
    return /osci[- ']?26|osci[- ']?2026/i.test(name);
  });
}

/**
 * Detects difficulty level from labels, title, and body.
 * Prioritizes maintainer labels first, then explicit tags in titles or bodies.
 */
export function detectDifficulty(item: { title?: string; body?: string | null; labels?: Array<{ name: string } | string> }): DifficultyLevel {
  const labelNames = (item.labels || [])
    .map((l) => (typeof l === "string" ? l : l.name || "").toLowerCase())
    .join(" ");

  // 1. Expert / Level 4 (50 pts)
  if (
    /expert|level[- :_]?4\b|lvl[- :_]?4\b|level4|lvl4|difficulty[- :_]+expert/i.test(labelNames)
  ) {
    return "expert";
  }

  // 2. Hard / Level 3 (30 pts)
  if (
    /hard\b|difficulty[- :_]+hard|level[- :_]?3\b|lvl[- :_]?3\b|level3|lvl3|advanced|complex/i.test(labelNames)
  ) {
    return "hard";
  }

  // 3. Medium / Level 2 (20 pts)
  if (
    /medium|med\b|intermediate|mid\b|difficulty[- :_]+medium|level[- :_]?2\b|lvl[- :_]?2\b|level2|lvl2/i.test(labelNames)
  ) {
    return "medium";
  }

  // 4. Easy / Level 1 (10 pts)
  if (
    /easy|beginner|starter|good[ -]?first[ -]?issue|difficulty[- :_]+easy|level[- :_]?1\b|lvl[- :_]?1\b|level1|lvl1/i.test(labelNames)
  ) {
    return "easy";
  }

  // Check title & body
  const fullText = `${item.title || ""} ${item.body || ""}`.toLowerCase();
  if (/\[expert\]|\(expert\)|level[- :_]?4\b|lvl[- :_]?4\b|level4|lvl4|difficulty:\s*expert/i.test(fullText)) {
    return "expert";
  }
  if (/\[hard\]|\(hard\)|level[- :_]?3\b|lvl[- :_]?3\b|level3|lvl3|difficulty:\s*hard|\bhard\b/i.test(fullText)) {
    return "hard";
  }
  if (/\[medium\]|\(medium\)|\[med\]|\(med\)|level[- :_]?2\b|lvl[- :_]?2\b|level2|lvl2|difficulty:\s*medium|\bmedium\b/i.test(fullText)) {
    return "medium";
  }
  if (/\[easy\]|\(easy\)|level[- :_]?1\b|lvl[- :_]?1\b|level1|lvl1|good[ -]?first[ -]?issue|difficulty:\s*easy|\beasy\b/i.test(fullText)) {
    return "easy";
  }

  return "easy";
}

/**
 * Extracts linked issue numbers from PR title or description (e.g., Fixes #123, Closes #45)
 */
export function extractLinkedIssueNumbers(text?: string | null): number[] {
  if (!text) return [];
  const regex = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
  const numbers: number[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && !numbers.includes(num)) {
      numbers.push(num);
    }
  }
  return numbers;
}

/**
 * Extracts a normalized "owner/repo" slug from a GitHub URL or string.
 * Supports:
 * - https://api.github.com/repos/owner/repo
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo/pull/123
 * - owner/repo
 */
export function extractRepoSlug(urlOrSlug?: string | null): string | null {
  if (!urlOrSlug) return null;
  const trimmed = urlOrSlug.trim();
  if (!trimmed || trimmed === "#") return null;

  // 1. Match api.github.com/repos/owner/repo
  const apiMatch = trimmed.match(/api\.github\.com\/repos\/([^\/\s#?]+)\/([^\/\s#?]+)/i);
  if (apiMatch) {
    const owner = apiMatch[1];
    const repo = apiMatch[2].replace(/\.git$/i, "").replace(/\/+$/, "");
    return `${owner}/${repo}`.toLowerCase();
  }

  // 2. Match github.com/owner/repo (ignoring sub-paths like /pull/..., /issues/...)
  const webMatch = trimmed.match(/github\.com\/([^\/\s#?]+)\/([^\/\s#?]+)/i);
  if (webMatch) {
    const owner = webMatch[1];
    if (!["orgs", "users", "search", "settings", "repos"].includes(owner.toLowerCase())) {
      const repo = webMatch[2].replace(/\.git$/i, "").replace(/\/+$/, "");
      return `${owner}/${repo}`.toLowerCase();
    }
  }

  // 3. Match raw "owner/repo"
  const clean = trimmed.replace(/^@+/, "").replace(/\.git$/i, "").replace(/\/+$/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 2 && !parts[0].includes(":") && !parts[1].includes(":")) {
    return `${parts[0]}/${parts[1]}`.toLowerCase();
  }

  return null;
}

// Module-level token pool for round-robin rotation across multiple GitHub PATs
let cachedTokenPool: string[] | null = null;
let tokenRotationIndex = 0;

export function getTokenPool(): string[] {
  if (cachedTokenPool !== null) {
    return cachedTokenPool;
  }
  const pool: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const t = process.env[`GITHUB_ACCESS_TOKEN_${i}`]?.trim();
    if (t && !pool.includes(t)) pool.push(t);
  }
  const legacy = (process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PAT)?.trim();
  if (legacy && !pool.includes(legacy)) pool.push(legacy);

  cachedTokenPool = pool;
  return pool;
}

/**
 * Returns GitHub API headers with optimal rate-limiting:
 * Prioritizes a round-robin token pool (GITHUB_ACCESS_TOKEN_1..5, GITHUB_ACCESS_TOKEN/PAT)
 * to multiply the 5,000 req/hr API quota across available tokens.
 * Falls back automatically to GitHub OAuth App Basic Auth (AUTH_GITHUB_ID/SECRET).
 */
export function getGitHubAuthHeaders(): Record<string, string> {
  const pool = getTokenPool();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "OSC-India-Sync-Engine",
  };

  if (pool.length > 0) {
    const token = pool[tokenRotationIndex % pool.length];
    tokenRotationIndex = (tokenRotationIndex + 1) % pool.length;
    headers.Authorization = `Bearer ${token}`;
  } else {
    const clientId = process.env.GITHUB_ID || process.env.AUTH_GITHUB_ID;
    const clientSecret = process.env.GITHUB_SECRET || process.env.AUTH_GITHUB_SECRET;
    if (clientId && clientSecret) {
      headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    }
  }
  return headers;
}
