export interface Project {
  title: string;
  githubRepo: string;
  description?: string;
  language?: string;
  accentColor?: string;
}

/**
 * Official competition / tracked repositories.
 * The GitHub Contribution Sync Engine checks user PRs against this list.
 */
export const PROJECTS: Project[] = [];

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
