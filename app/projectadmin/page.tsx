import React from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ProjectAdminUI from "./ProjectAdminUI";
import {
  getProjectAdminData,
  purgeProjectAdminScores,
  ProjectAdminData,
} from "@/lib/actions/project-admin";
import { OFFICIAL_PROJECT_ADMIN_HANDLES } from "@/lib/utils/github-helpers";
import customProjectsData from "@/data/custom-projects.json";

export const dynamic = "force-dynamic";



export default async function ProjectAdminPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = props?.searchParams ? await props.searchParams : {};
  
  // If anyone tries to pass ?admin= query override, reject and redirect to clean /projectadmin
  if (resolvedParams?.admin) {
    redirect("/projectadmin");
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user || null;

  // 1. AUTH GUARD: Unauthenticated users are redirected to sign-in
  if (!user) {
    redirect("/sign-in");
  }

  const admin = createAdminClient();
  let profile = null;

  const { data: profileByUserId } = await admin
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  profile = profileByUserId;

  if (!profile) {
    const { data: profileById } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = profileById;
  }

  const userGithubHandle = (
    profile?.github ||
    user.user_metadata?.user_name ||
    user.user_metadata?.preferred_username ||
    user.user_metadata?.github ||
    ""
  )
    .replace(/^@+/, "")
    .trim();

  const userGhLower = userGithubHandle.toLowerCase();
  const rawRole = (profile?.role || user.user_metadata?.role || "contributor") as string;
  const isOfficialAdminHandle = OFFICIAL_PROJECT_ADMIN_HANDLES.has(userGhLower);
  const isProjectAdmin = rawRole === "project-admin" || isOfficialAdminHandle;

  // 2. ACCESS CONTROL: Only Project Admins can access this section. All others are redirected to dashboard.
  if (!isProjectAdmin) {
    redirect("/dashboard");
  }

  // Auto-sync role to project-admin in DB if user handle matches official list
  if (isOfficialAdminHandle && profile && profile.role !== "project-admin") {
    try {
      const adminClient = createAdminClient();
      await adminClient
        .from("profiles")
        .update({ role: "project-admin", score: 0 })
        .eq("id", profile.id);
    } catch {}
  }

  // 3. REPO ACCESS RULE: Each project admin has access strictly and only to their own repo.
  // The handle is locked 100% to the authenticated user's own GitHub account.
  const effectiveGithubHandle = userGithubHandle;

  if (!effectiveGithubHandle) {
    redirect("/dashboard");
  }

  // Score Purge: ensure project admins earn 0 points
  try {
    await purgeProjectAdminScores();
  } catch {}

  // 4. Fetch Project Admin data from database
  let projectAdminData: ProjectAdminData | null = null;
  try {
    projectAdminData = await getProjectAdminData(effectiveGithubHandle, user.id);
  } catch (fetchErr) {
    console.error("DB fetch error in getProjectAdminData:", fetchErr);
  }

  // If project not yet in database, resolve metadata from custom-projects.json
  if (!projectAdminData) {
    const handleLower = effectiveGithubHandle.toLowerCase();
    const matchedProject = customProjectsData.find((p) => {
      const url = (p.githubUrl || "").toLowerCase();
      return (
        url.includes(`/${handleLower}/`) ||
        url.endsWith(`/${handleLower}`) ||
        (handleLower === "jugaadlang" && url.includes("jugaadlang")) ||
        (handleLower === "sandesh13fr" && url.includes("tcalc"))
      );
    });

    if (matchedProject) {
      projectAdminData = {
        project: {
          id: matchedProject.id,
          name: matchedProject.title,
          url: matchedProject.githubUrl || `https://github.com/${effectiveGithubHandle}`,
          description: (matchedProject.description || "").replace(/<!--[\s\S]*?-->/g, "").trim(),
        },
        totalPRsMerged: 0,
        prsMergedByAdmin: 0,
        totalContributors: 0,
        totalPointsAwarded: 0,
        contributions: [],
        difficultyBreakdown: {
          easy: { count: 0, points: 0 },
          medium: { count: 0, points: 0 },
          hard: { count: 0, points: 0 },
          expert: { count: 0, points: 0 },
        },
        contributorSummary: [],
      };
    }
  } else if (projectAdminData.project?.description) {
    projectAdminData.project.description = projectAdminData.project.description
      .replace(/<!--[\s\S]*?-->/g, "")
      .trim();
  }

  const fullName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    effectiveGithubHandle ||
    "Maintainer";

  const avatar =
    profile?.avatar_url ||
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    (effectiveGithubHandle ? `https://avatars.githubusercontent.com/${effectiveGithubHandle}` : null);

  const viewerProfile = {
    id: user.id,
    name: fullName,
    email: user.email || "",
    avatar,
    role: "project-admin",
    isAdmin: false,
    isProjectAdmin: true,
    github: effectiveGithubHandle,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060608",
        backgroundImage:
          "radial-gradient(ellipse 800px 400px at 85% 10%, rgba(255, 117, 24, 0.12), transparent 75%)",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
        color: "#ffffff",
      }}
    >
      <Navbar initialProfile={viewerProfile} />
      <div style={{ height: "96px", width: "100%", flexShrink: 0 }} aria-hidden="true" />

      <main
        style={{
          margin: "0 auto",
          maxWidth: "1320px",
          width: "100%",
          paddingTop: "24px",
          paddingBottom: "96px",
          paddingLeft: "clamp(16px, 4vw, 40px)",
          paddingRight: "clamp(16px, 4vw, 40px)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ProjectAdminUI
          adminProfile={{
            name: fullName,
            github: effectiveGithubHandle,
            avatar,
            role: "project-admin",
          }}
          data={projectAdminData}
        />
      </main>

      <Footer />
    </div>
  );
}
