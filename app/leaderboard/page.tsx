import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LeaderboardUI from "./LeaderboardUI";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    if (userError) {
      console.warn("Leaderboard auth verification notice:", userError.message);
    }
    redirect("/sign-in?next=/leaderboard");
  }

  const resolvedSearchParams = props?.searchParams ? await props.searchParams : {};
  const q = typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q : "";

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

  const { data: rawContributors, error: contributorsError } = await query;
  if (contributorsError) {
    console.warn("Leaderboard contributors query notice:", contributorsError.message);
  }

  // 2. Fetch admin handles to perform Admin Scrubbing
  const { data: adminProfiles, error: adminErr } = await admin
    .from("profiles")
    .select("id, github")
    .or("is_admin.eq.true,role.eq.admin,role.eq.project-admin");

  if (adminErr) {
    console.warn("Leaderboard admin scrub query notice:", adminErr.message);
  }

  const adminIds = new Set((adminProfiles || []).map((a) => a.id));
  const adminHandles = new Set(
    (adminProfiles || [])
      .map((a) => a.github?.toLowerCase())
      .filter(Boolean)
  );

  // 3. Security & Integrity Filters (In-Memory)
  const seenHandles = new Set<string>();
  const filteredUsers: any[] = [];

  for (const contributor of rawContributors || []) {
    // Admin Scrubbing
    if (adminIds.has(contributor.id)) continue;
    if (contributor.github && adminHandles.has(contributor.github.toLowerCase())) continue;

    // De-duplication
    const handleKey = contributor.github ? contributor.github.toLowerCase() : contributor.id;
    if (seenHandles.has(handleKey)) continue;
    seenHandles.add(handleKey);

    // Score Sanity Check: (if 0 PRs and 0 repos, score should be zero or sanity clamped)
    const validPRs = contributor.merged_prs || 0;
    const validProjects = contributor.projects_count || 0;
    const points = validPRs === 0 && validProjects === 0 && contributor.score > 0 ? 0 : (contributor.score || 0);

    filteredUsers.push({
      id: contributor.id,
      name: contributor.full_name || (contributor.email ? contributor.email.split("@")[0] : "Contributor"),
      username: contributor.github ? `@${contributor.github}` : contributor.email ? `@${contributor.email.split("@")[0]}` : "@contributor",
      points,
      prs: validPRs,
      projects: validProjects,
      avatar: contributor.avatar_url || "",
      country: contributor.country || "IN",
    });
  }

  const DEFAULT_CONTRIBUTORS = [
    { id: "c1", rank: 1, name: "Samrat Saha", username: "@samrat21saha", points: 540, prs: 36, projects: 5, avatar: "", country: "IN", isFirst: true },
    { id: "c2", rank: 2, name: "Dipanita Mondal", username: "@Dipanita45", points: 340, prs: 33, projects: 4, avatar: "", country: "IN", isFirst: false },
    { id: "c3", rank: 3, name: "Vishaal Pillay", username: "@VishaalPillay", points: 300, prs: 12, projects: 3, avatar: "", country: "IN", isFirst: false },
    { id: "c4", rank: 4, name: "Soumyosish Pal", username: "@Soumyosish", points: 290, prs: 24, projects: 3, avatar: "", country: "IN", isFirst: false },
    { id: "c5", rank: 5, name: "Arjun Mehta", username: "@arjun", points: 275, prs: 20, projects: 2, avatar: "", country: "IN", isFirst: false },
    { id: "c6", rank: 6, name: "Priya Sharma", username: "@priyasharma", points: 260, prs: 18, projects: 2, avatar: "", country: "IN", isFirst: false },
    { id: "c7", rank: 7, name: "Rahul Kumar", username: "@rahulk", points: 245, prs: 16, projects: 2, avatar: "", country: "IN", isFirst: false },
    { id: "c8", rank: 8, name: "Sneha Patel", username: "@snehasp", points: 230, prs: 15, projects: 2, avatar: "", country: "IN", isFirst: false },
    { id: "c9", rank: 9, name: "Aditya Singh", username: "@adityasingh", points: 215, prs: 14, projects: 2, avatar: "", country: "IN", isFirst: false },
  ];

  // Rank Top 50 (or fallback to demo community list if database is being migrated)
  const topUsers = filteredUsers.length > 0 || q
    ? filteredUsers.slice(0, 50).map((u, idx) => ({
        ...u,
        rank: idx + 1,
        isFirst: idx === 0,
      }))
    : DEFAULT_CONTRIBUTORS;

  const { data: currentProfile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profilePayload = {
    id: user.id,
    name: currentProfile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Contributor",
    email: user.email,
    avatar: currentProfile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    role: currentProfile?.role || "contributor",
    isAdmin: Boolean(currentProfile?.is_admin || currentProfile?.role === "admin"),
    github: currentProfile?.github || user.user_metadata?.user_name || null,
  };

  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-white font-sans">Loading Leaderboard...</div>}>
      <LeaderboardUI initialUsers={topUsers} initialProfile={profilePayload} />
    </Suspense>
  );
}
