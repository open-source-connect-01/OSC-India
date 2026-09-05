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
