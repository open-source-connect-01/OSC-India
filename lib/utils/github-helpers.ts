export type DifficultyLevel = "easy" | "medium" | "hard" | "expert";

export const DIFFICULTY_POINTS: Record<DifficultyLevel, number> = {
  easy: 10,
  medium: 20,
  hard: 30,
  expert: 50,
};

/** Points awarded to a project-admin for every OSCI'26-labelled PR they merge. */
export const MERGER_POINTS = 5;

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
  "https://github.com/Sandesh13fr/TCalc",
  "https://github.com/SrishtiSonam/AtomicBinding",
  "https://github.com/JugaadLang/jugaadlang",
  "https://github.com/SoumyaMishra-7/WalletWise",
  "https://github.com/SrigadaAkshayKumar/stock",
  "https://github.com/Sushmitha-2007/Eco-vision",
  "https://github.com/KanishJebaMathewM/Truxify",
  "https://github.com/AdityaPainuli/clippings-vids",
  "https://github.com/l3tchupkt/adaptq",
  "https://github.com/SidakSethi-Singh/LawSathi-Rag",
  "https://github.com/logeshv586-code/AIproductfactory",
  "https://github.com/GauravKarakoti/Secureflow",
  "https://github.com/abhaycs24/CBSOT_SIP_PROJECT-1-",
  "https://github.com/pratyushjha06/Dockfleet",
  "https://github.com/aashutoshkumarbhardwaj/CreatorOs",
  "https://github.com/ItsVikasA/Innovision-Open-Source",
  "https://github.com/AseemPrasad/Air-Quality-Intelligence",
] as const;

/**
 * Normalized lowercase "owner/repo" slugs for all 17 official competition repositories.
 */
export const OFFICIAL_COMPETITION_REPO_SLUGS = new Set([
  "sandesh13fr/tcalc",
  "srishtisonam/atomicbinding",
  "jugaadlang/jugaadlang",
  "soumyamishra-7/walletwise",
  "srigadaakshaykumar/stock",
  "sushmitha-2007/eco-vision",
  "kanishjebamathewm/truxify",
  "adityapainuli/clippings-vids",
  "l3tchupkt/adaptq",
  "sidaksethi-singh/lawsathi-rag",
  "logeshv586-code/aiproductfactory",
  "gauravkarakoti/secureflow",
  "abhaycs24/cbsot_sip_project-1-",
  "pratyushjha06/dockfleet",
  "aashutoshkumarbhardwaj/creatoros",
  "itsvikasa/innovision-open-source",
  "aseemprasad/air-quality-intelligence",
]);

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
 * Detects difficulty level from labels, title, and body.
 * Prioritizes maintainer labels first, then explicit tags in titles or bodies.
 */
export function detectDifficulty(item: { title?: string; body?: string | null; labels?: Array<{ name: string }> }): DifficultyLevel {
  const labelNames = (item.labels || []).map((l) => l.name.toLowerCase()).join(" ");

  // 1. Check official maintainer labels first (highest precedence)
  if (/expert|exp\b|advanced|level[- ]?4/i.test(labelNames)) {
    return "expert";
  }
  if (/hard\b|difficulty[- :]+hard|level[- ]?3/i.test(labelNames)) {
    return "hard";
  }
  if (/medium|med\b|intermediate|mid\b|difficulty[- :]+medium|level[- ]?2/i.test(labelNames)) {
    return "medium";
  }
  if (/easy|beginner|starter|good[ -]?first[ -]?issue|difficulty[- :]+easy|level[- ]?1/i.test(labelNames)) {
    return "easy";
  }

  // 2. Check title for explicit bracketed tags or levels
  const title = (item.title || "").toLowerCase();
  if (/expert|advanced|level[- ]?4|\[expert\]|\(expert\)/i.test(title)) {
    return "expert";
  }
  if (/\[hard\]|\(hard\)|difficulty[- :]+hard|level[- ]?3/i.test(title)) {
    return "hard";
  }
  if (/\[medium\]|\(medium\)|difficulty[- :]+medium|level[- ]?2/i.test(title)) {
    return "medium";
  }
  if (/\[easy\]|\(easy\)|good[ -]?first[ -]?issue|difficulty[- :]+easy|level[- ]?1/i.test(title)) {
    return "easy";
  }

  // 3. Fallback to body for explicit difficulty declarations
  const body = (item.body || "").toLowerCase();
  if (/difficulty:\s*expert|level[- ]?4/i.test(body)) {
    return "expert";
  }
  if (/difficulty:\s*hard|level[- ]?3/i.test(body)) {
    return "hard";
  }
  if (/difficulty:\s*medium|level[- ]?2/i.test(body)) {
    return "medium";
  }
  if (/difficulty:\s*easy|level[- ]?1/i.test(body)) {
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
