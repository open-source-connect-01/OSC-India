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
  const q = typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q.trim() : "";

  const admin = createAdminClient();

  // 1. Fetch directly from public.profiles joined with public.users (blazing fast Postgres query)
  let allContributors: any[] = [];
  try {
    let query = admin
      .from("profiles")
      .select("*, users(name, email, image)")
      .neq("role", "admin")
      .neq("role", "project-admin")
      .order("score", { ascending: false });

    if (q) {
      query = query.or(`full_name.ilike.%${q}%,github.ilike.%${q}%`);
    }

    const { data: dbRows, error } = await query;
    if (!error && dbRows && dbRows.length > 0) {
      allContributors = dbRows.map((p: any) => {
        const u = p.users || {};
        const email = (u.email || p.email || "").toLowerCase().trim();
        const github = (p.github || "").replace(/^@+/, "").trim();

        return {
          id: p.user_id || p.id,
          email,
          name: p.full_name || u.name || "Contributor",
          username: github ? `@${github}` : email ? `@${email.split("@")[0]}` : "@contributor",
          github,
          role: p.role || "contributor",
          isAdmin: false,
          points: Number(p.score ?? 0),
          prs: Number(p.merged_prs ?? 0),
          projects: Number(p.projects_count ?? 0),
          avatar: p.avatar_url || u.image || "",
          country: p.country || "IN",
        };
      });
    }
  } catch (err: any) {
    console.warn("Leaderboard profiles fetch notice:", err.message);
  }

  // 2. Fallback only if public.profiles returned nothing
  if (allContributors.length === 0) {
    try {
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (!error && data?.users) {
        allContributors = data.users
          .filter((u: any) => {
            const role = u.user_metadata?.role || "contributor";
            return role !== "admin" && role !== "project-admin" && !u.user_metadata?.is_admin;
          })
          .map((u: any) => {
            const meta = u.user_metadata || {};
            const email = (u.email || meta.email || "").trim().toLowerCase();
            const rawGithub = meta.github || meta.user_name || meta.preferred_username || "";
            const github = rawGithub ? rawGithub.replace(/^@+/, "").trim().toLowerCase() : "";

            return {
              id: u.id,
              email,
              name: meta.full_name || meta.name || email.split("@")[0] || "Contributor",
              username: github ? `@${github}` : email ? `@${email.split("@")[0]}` : "@contributor",
              github,
              role: meta.role || "contributor",
              isAdmin: false,
              points: Number(meta.score ?? 0),
              prs: Number(meta.merged_prs ?? 0),
              projects: Number(meta.projects_count ?? 0),
              avatar: meta.avatar_url || meta.picture || "",
              country: meta.country || "IN",
            };
          });
      }
    } catch (err: any) {
      console.warn("Leaderboard auth.users fetch notice:", err.message);
    }
  }

  // 3. Search Filter (if not already filtered by SQL)
  const filteredUsers = q
    ? allContributors.filter((u) => {
        const query = q.toLowerCase();
        return (
          u.name.toLowerCase().includes(query) ||
          u.username.toLowerCase().includes(query) ||
          (u.github && u.github.toLowerCase().includes(query))
        );
      })
    : allContributors;

  // 4. Sort by Points (desc), PRs (desc), Projects (desc), Name (asc)
  filteredUsers.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.prs !== a.prs) return b.prs - a.prs;
    if (b.projects !== a.projects) return b.projects - a.projects;
    return a.name.localeCompare(b.name);
  });

  // 5. Rank Top 50 without dummy data
  const topUsers = filteredUsers.slice(0, 50).map((u, idx) => ({
    id: u.id,
    rank: idx + 1,
    name: u.name,
    username: u.username,
    points: u.points,
    prs: u.prs,
    projects: u.projects,
    avatar: u.avatar,
    country: u.country || "IN",
    isFirst: idx === 0,
  }));

  const { data: currentProfile } = await admin
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const profilePayload = {
    id: user.id,
    name: currentProfile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Contributor",
    email: user.email,
    avatar: currentProfile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    role: currentProfile?.role || user.user_metadata?.role || "contributor",
    isAdmin: Boolean(currentProfile?.is_admin || user.user_metadata?.is_admin),
    github: currentProfile?.github || user.user_metadata?.github || user.user_metadata?.user_name || null,
  };

  return (
    <LeaderboardUI initialUsers={topUsers} initialProfile={profilePayload} initialSearch={q} />
  );
}
