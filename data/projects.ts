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
export const PROJECTS: Project[] = [
  {
    title: "OSC-India Platform",
    githubRepo: "https://github.com/OSC-India/platform",
    description: "Official web platform and dashboard for Open Source Connect India.",
    language: "TypeScript",
    accentColor: "#f97316",
  },
  {
    title: "CloudNative Orchestrator",
    githubRepo: "https://github.com/OSC-India/cloudnative-orchestrator",
    description: "Modern container orchestration platform built for scalability and performance.",
    language: "Go",
    accentColor: "#22d3ee",
  },
  {
    title: "DataFlow Pipeline",
    githubRepo: "https://github.com/OSC-India/dataflow-pipeline",
    description: "Real-time data processing framework with distributed architecture.",
    language: "Python",
    accentColor: "#34d399",
  },
  {
    title: "ReactUI Components",
    githubRepo: "https://github.com/OSC-India/reactui-components",
    description: "Comprehensive component library with accessibility-first design.",
    language: "TypeScript",
    accentColor: "#f472b6",
  },
  {
    title: "ML Vision Toolkit",
    githubRepo: "https://github.com/OSC-India/ml-vision-toolkit",
    description: "Computer vision library powered by cutting-edge machine learning models.",
    language: "Python",
    accentColor: "#ef4444",
  },
  {
    title: "SecureAuth Framework",
    githubRepo: "https://github.com/OSC-India/secureauth-framework",
    description: "Enterprise-grade authentication and authorization solution.",
    language: "Rust",
    accentColor: "#3b82f6",
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

  return slugs;
}

export function extractRepoSlug(url: string): string | null {
  if (!url) return null;
  const match = url.match(/github\.com\/([^\/]+\/[^\/\s#?]+)/i);
  return match ? match[1].replace(/\.git$/i, "") : null;
}
