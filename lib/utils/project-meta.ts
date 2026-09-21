// Project metadata is stored as an HTML comment appended to projects.description:
//   "Some text\n<!--meta:{"language":"TS","status":"pending","admin_github":"octocat"}-->"
// A missing status means the project is approved (all pre-existing projects).

export type ProjectStatus = "approved" | "pending" | "rejected";

const META_RE = /<!--meta:(.*?)-->/;

export function readProjectMeta(description?: string | null): Record<string, unknown> {
  const match = (description || "").match(META_RE);
  if (!match) return {};
  try {
    const parsed = JSON.parse(match[1]);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function projectStatusOf(description?: string | null): ProjectStatus {
  const status = readProjectMeta(description).status;
  return status === "pending" || status === "rejected" ? status : "approved";
}

/** Returns the description with its meta comment merged with `patch`; keys set to null are removed. */
export function withProjectMeta(description: string, patch: Record<string, unknown>): string {
  const meta = { ...readProjectMeta(description), ...patch };
  for (const key of Object.keys(meta)) {
    if (meta[key] === null || meta[key] === undefined) delete meta[key];
  }
  const text = (description || "").replace(META_RE, "").trim();
  return `${text}\n<!--meta:${JSON.stringify(meta)}-->`;
}
