import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LeaderboardUI from "./LeaderboardUI";

export const revalidate = 30; // Revalidate every 30 seconds

export default async function LeaderboardPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const q = (searchParams?.q as string) || "";

  const admin = createAdminClient();

  // 1. Fetch contributors ordered by score
  let query = admin
    .from("profiles")
    .select("id, full_name, email, github, avatar_url, role, is_admin, score, merged_prs, projects_count, country")
    .eq("role", "contributor")
    .order("score", { ascending: false })
    .limit(100);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,github.ilike.%${q}%`);
  }

  const { data: rawContributors } = await query;

  // 2. Fetch admin handles to perform Admin Scrubbing
  const { data: adminProfiles } = await admin
    .from("profiles")
    .select("id, github")
    .or("is_admin.eq.true,role.eq.admin,role.eq.project-admin");

  const adminIds = new Set((adminProfiles || []).map((a) => a.id));
  const adminHandles = new Set(
    (adminProfiles || [])
      .map((a) => a.github?.toLowerCase())
      .filter(Boolean)
  );

  // 3. Security & Integrity Filters (In-Memory)
  const seenHandles = new Set<string>();
  const filteredUsers: any[] = [];

  for (const user of rawContributors || []) {
    // Admin Scrubbing
    if (adminIds.has(user.id)) continue;
    if (user.github && adminHandles.has(user.github.toLowerCase())) continue;

    // De-duplication
    const handleKey = user.github ? user.github.toLowerCase() : user.id;
    if (seenHandles.has(handleKey)) continue;
    seenHandles.add(handleKey);

    // Score Sanity Check: (if 0 PRs and 0 repos, score should be zero or sanity clamped)
    const validPRs = user.merged_prs || 0;
    const validProjects = user.projects_count || 0;
    const points = validPRs === 0 && validProjects === 0 && user.score > 0 ? 0 : (user.score || 0);

    filteredUsers.push({
      id: user.id,
      name: user.full_name || (user.email ? user.email.split("@")[0] : "Contributor"),
      username: user.github ? `@${user.github}` : user.email ? `@${user.email.split("@")[0]}` : "@contributor",
      points,
      prs: validPRs,
      projects: validProjects,
      avatar: user.avatar_url || "",
      country: user.country || "IN",
    });
  }

  // Rank Top 50
  const topUsers = filteredUsers.slice(0, 50).map((u, idx) => ({
    ...u,
    rank: idx + 1,
    isFirst: idx === 0,
  }));

  return <LeaderboardUI initialUsers={topUsers} />;
}
