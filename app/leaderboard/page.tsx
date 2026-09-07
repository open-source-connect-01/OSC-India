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

  // 1. Fetch from profiles table (resilient)
  let rawProfiles: any[] = [];
  try {
    const { data, error } = await admin.from("profiles").select("*");
    if (!error && data) {
      rawProfiles = data;
    }
  } catch (err: any) {
    console.warn("Leaderboard profiles fetch notice:", err.message);
  }

  // 2. Fetch from auth.users (source of truth for metadata scores and PR counts)
  let authUsers: any[] = [];
  try {
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (!error && data?.users) {
      authUsers = data.users;
    }
  } catch (err: any) {
    console.warn("Leaderboard auth.users fetch notice:", err.message);
  }

  // 3. Deduplicate and merge users into a unified map
  const userMap = new Map<string, any>();

  function findExistingKey(email: string, github: string, id: string, name: string): string | null {
    const normEmail = email.trim().toLowerCase();
    const normGithub = github.replace(/^@+/, "").trim().toLowerCase();
    const normName = name.trim().toLowerCase();

    for (const [key, existing] of userMap.entries()) {
      if (normGithub && existing.github && existing.github.toLowerCase() === normGithub) {
        return key;
      }
      if (normEmail && existing.email && existing.email.toLowerCase() === normEmail) {
        return key;
      }
      if (id && (existing.id === id || existing.userId === id)) {
        return key;
      }
      if (normName && existing.name && existing.name.toLowerCase() === normName && normName !== "contributor") {
        return key;
      }
    }
    return null;
  }

  // First: process auth.users
  for (const u of authUsers) {
    const meta = u.user_metadata || {};
    const email = (u.email || meta.email || "").trim().toLowerCase();
    const fullName = (meta.full_name || meta.name || (email ? email.split("@")[0] : "Contributor")).trim();
    const avatar = meta.avatar_url || meta.picture || "";
    const rawGithub = meta.github || meta.user_name || meta.preferred_username || "";
    const github = rawGithub ? rawGithub.replace(/^@+/, "").trim().toLowerCase() : "";
    const role = meta.role || "contributor";
    const isAdmin = Boolean(meta.is_admin || role === "admin" || role === "project-admin");
    const score = Number(meta.score ?? 0);
    const prs = Number(meta.merged_prs ?? 0);
    const projects = Number(meta.projects_count ?? 0);

    // Skip accounts that are strictly admin/project-admin
    if (role === "admin" || role === "project-admin" || (meta.is_admin && role !== "contributor")) {
      continue;
    }

    const matchedKey = findExistingKey(email, github, u.id, fullName);
    if (matchedKey) {
      const existing = userMap.get(matchedKey);
      existing.points = Math.max(existing.points, score);
      existing.prs = Math.max(existing.prs, prs);
      existing.projects = Math.max(existing.projects, projects);
      if (!existing.github && github) {
        existing.github = github;
        existing.username = `@${github}`;
      }
      if (!existing.avatar && avatar) existing.avatar = avatar;
      if (!existing.email && email) existing.email = email;
    } else {
      const key = github ? `gh:${github}` : email ? `em:${email}` : `id:${u.id}`;
      userMap.set(key, {
        id: u.id,
        email,
        name: fullName,
        username: github ? `@${github}` : email ? `@${email.split("@")[0]}` : "@contributor",
        github,
        role,
        isAdmin,
        points: score,
        prs,
        projects,
        avatar,
        country: meta.country || "IN",
      });
    }
  }

  // Second: merge profiles table records
  for (const p of rawProfiles) {
    const rawP = p as any;
    const email = (p.email || "").trim().toLowerCase();
    const rawGithub = p.github || "";
    const github = rawGithub ? rawGithub.replace(/^@+/, "").trim().toLowerCase() : "";
    const fullName = (p.full_name || "").trim();
    const role = p.role || "contributor";
    const isAdmin = Boolean(p.is_admin || role === "admin" || role === "project-admin");
    const score = Number(p.score ?? 0);
    const prs = Number(p.merged_prs ?? 0);
    const projects = Number(p.projects_count ?? 0);

    if (role === "admin" || role === "project-admin" || (p.is_admin && role !== "contributor")) {
      continue;
    }

    const matchedKey =
      findExistingKey(email, github, p.id, fullName) ||
      (rawP.user_id ? findExistingKey(email, github, rawP.user_id, fullName) : null);

    if (matchedKey) {
      const existing = userMap.get(matchedKey);
      if (p.full_name) existing.name = p.full_name;
      if (p.avatar_url && !existing.avatar) existing.avatar = p.avatar_url;
      if (p.score !== undefined && p.score !== null) existing.points = Math.max(existing.points, score);
      if (p.merged_prs !== undefined && p.merged_prs !== null) existing.prs = Math.max(existing.prs, prs);
      if (p.projects_count !== undefined && p.projects_count !== null) existing.projects = Math.max(existing.projects, projects);
      if (p.country) existing.country = p.country;
    } else {
      const key = github ? `gh:${github}` : email ? `em:${email}` : `id:${p.id}`;
      userMap.set(key, {
        id: p.id,
        email,
        name: fullName || "Contributor",
        username: github ? `@${github}` : email ? `@${email.split("@")[0]}` : "@contributor",
        github,
        role,
        isAdmin,
        points: score,
        prs,
        projects,
        avatar: p.avatar_url || "",
        country: p.country || "IN",
      });
    }
  }

  const allContributors = Array.from(userMap.values());

  // 4. Search Filter
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

  // 5. Sort by Points (desc), PRs (desc), Projects (desc), Name (asc)
  filteredUsers.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.prs !== a.prs) return b.prs - a.prs;
    if (b.projects !== a.projects) return b.projects - a.projects;
    return a.name.localeCompare(b.name);
  });

  // 6. Rank Top 50 without dummy data
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
    .eq("id", user.id)
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
