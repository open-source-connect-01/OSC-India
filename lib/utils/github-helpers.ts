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
 * Detects difficulty level from labels, title, and body
 */
export function detectDifficulty(item: { title?: string; body?: string | null; labels?: Array<{ name: string }> }): DifficultyLevel {
  const labelNames = (item.labels || []).map((l) => l.name.toLowerCase()).join(" ");
  const text = `${labelNames} ${item.title || ""} ${item.body || ""}`.toLowerCase();

  if (/expert|exp\b|advanced/.test(text)) {
    return "expert";
  }
  if (/hard\b|high\b/.test(text)) {
    return "hard";
  }
  if (/medium|med\b|intermediate|mid\b/.test(text)) {
    return "medium";
  }
  if (/easy|beginner|starter|good[ -]?first[ -]?issue/.test(text)) {
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
 * Extracts a normalized "owner/repo" slug from a GitHub URL or string
 */
export function extractRepoSlug(urlOrSlug?: string | null): string | null {
  if (!urlOrSlug) return null;
  const trimmed = urlOrSlug.trim();
  if (!trimmed || trimmed === "#") return null;

  // Match github.com/owner/repo in URLs
  const match = trimmed.match(/github\.com\/([^\/\s#?]+)\/([^\/\s#?]+)/i);
  if (match) {
    const owner = match[1];
    const repo = match[2].replace(/\.git$/i, "").replace(/\/+$/, "");
    return `${owner}/${repo}`.toLowerCase();
  }

  // Match raw "owner/repo"
  const clean = trimmed.replace(/^@+/, "").replace(/\.git$/i, "").replace(/\/+$/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 2 && !parts[0].includes(":") && !parts[1].includes(":")) {
    return `${parts[0]}/${parts[1]}`.toLowerCase();
  }

  return null;
}
