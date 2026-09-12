import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import ActivityMatrix from "../components/ActivityMatrix";
import TechStack from "../components/TechStack";
import GitHubLinkCard from "../components/GitHubLinkCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    if (userError) {
      console.warn("DashboardPage auth verification notice:", userError.message);
    }
    redirect("/sign-in");
  }

  const admin = createAdminClient();

  const userEmail = (user.email || user.user_metadata?.email || "").trim().toLowerCase();
  const metaGithub =
    user.user_metadata?.user_name ||
    user.user_metadata?.preferred_username ||
    null;

  // 1. Fetch profile by user_id (foreign key to auth.users / public.users)
  let { data: profile } = await admin
    .from("profiles")
    .select("*, users!inner(email)")
    .eq("user_id", user.id)
    .maybeSingle();

  // 2. If not found by user_id, fallback search by GitHub username
  if (!profile && metaGithub) {
    const { data: byGithub } = await admin
      .from("profiles")
      .select("*, users!inner(email)")
      .ilike("github", metaGithub)
      .maybeSingle();
    if (byGithub) {
      profile = byGithub;
    }
  }

  const fullName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "Contributor";
  const avatar = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
  const githubUsername =
    profile?.github ||
    metaGithub ||
    null;

  // Auto-provision profile only if genuinely missing from database
  if (!profile) {
    try {
      const { data: created, error: upsertErr } = await admin
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            full_name: fullName,
            avatar_url: avatar,
            github: githubUsername,
            role: "contributor",
            score: 0,
            merged_prs: 0,
            projects_count: 0,
            badges_created: 0,
            tech_stack: [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select("*, users!inner(email)")
        .maybeSingle();
      if (upsertErr) {
        console.warn("Profile auto-provision warning:", upsertErr.message);
      } else if (created) {
        profile = created;
      }
    } catch (err: any) {
      console.warn("Profile auto-provision error:", err.message);
    }
  } else if (!profile.github && metaGithub) {
    try {
      await admin
        .from("profiles")
        .update({ github: metaGithub, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      profile.github = metaGithub;
    } catch (err: any) {
      console.warn("Profile github sync warning:", err.message);
    }
  }

  // Fetch individual verified contributions from public.contributions joined with projects
  const { data: userContributions } = await admin
    .from("contributions")
    .select("id, type, github_url, status, points_awarded, contributed_at, projects(id, name, github_repo_url)")
    .eq("user_id", user.id)
    .order("contributed_at", { ascending: false });

  const userMeta = user.user_metadata || {};
  const isOwner = (user.email || "").toLowerCase() === (process.env.ADMIN_PORTAL_EMAIL || "sayanghosh1887@gmail.com").toLowerCase();
  const rawRole = profile?.role || userMeta.role || (isOwner ? "admin" : "contributor");
  const roleName = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
  const username = githubUsername || user.email?.split("@")[0] || "user";
  const totalPoints = profile?.score ?? userMeta.score ?? 0;
  const mergedPRs = profile?.merged_prs ?? userMeta.merged_prs ?? 0;
  const projectsCount = profile?.projects_count ?? userMeta.projects_count ?? 0;
  const badgesCreated = profile?.badges_created ?? userMeta.badges_created ?? 0;
  const isProjectAdmin = rawRole === "project-admin";
  const isSuperAdmin = Boolean(profile?.is_admin || userMeta.is_admin || isOwner || rawRole === "admin");

  const profilePayload = {
    id: user.id,
    name: fullName,
    email: user.email,
    avatar: avatar,
    role: rawRole,
    isAdmin: isSuperAdmin,
    github: githubUsername,
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-white">
      <Navbar initialProfile={profilePayload} />
      <div style={{ height: "96px", width: "100%", flexShrink: 0 }} aria-hidden="true" />

      <main className="flex-grow flex flex-col items-center" style={{ margin: "0 auto", maxWidth: "1440px", width: "100%", paddingBottom: "96px", paddingTop: "24px", paddingLeft: "clamp(20px, 5vw, 64px)", paddingRight: "clamp(20px, 5vw, 64px)", overflowX: "hidden", boxSizing: "border-box" }}>
        
        {/* Header */}
        <div style={{ width: "100%", marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,96,0,0.1)", color: "var(--orange)", padding: "4px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: 600, marginBottom: "20px" }}>
              
              
            </div>
            <h1 style={{ fontSize: "clamp(32px, 8vw, 40px)", fontWeight: 800, marginBottom: "8px", letterSpacing: "-0.02em" }}>Dashboard</h1>
            <p style={{ color: "#9ca3af", fontSize: "15px" }}>Your open source journey, verified scores, and active badges.</p>
          </div>
        </div>

        {/* GitHub Link Banner (shown when GitHub not connected) */}
        {!githubUsername && (
          <div style={{ width: "100%", marginBottom: "24px" }}>
            <GitHubLinkCard userId={user.id} />
          </div>
        )}

        {/* Top Grid Area (Profile + Stats) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full mb-12">
          
          {/* LEFT COLUMN: Profile info */}
          <div className="md:col-span-1 xl:col-span-1" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Main Profile Card */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "24px", padding: "clamp(24px, 4vw, 40px) 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Avatar Wrapper (relative container without overflow:hidden so badge is never clipped) */}
              <div style={{ position: "relative", width: "120px", height: "120px", marginBottom: "20px" }}>
                <div 
                  style={{ 
                    width: "100%", 
                    height: "100%", 
                    borderRadius: "50%", 
                    border: "2px solid var(--orange)", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    fontSize: "48px", 
                    fontWeight: 800, 
                    color: "white", 
                    overflow: "hidden",
                    background: "#161618",
                    boxShadow: "0 0 20px rgba(255, 96, 0, 0.2)"
                  }}
                >
                  {avatar ? (
                    <img src={avatar} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span>{fullName[0] || "U"}</span>
                  )}
                </div>

                {/* Verified Badge anchored cleanly on the bottom-right perimeter */}
                <div 
                  title="Verified Contributor"
                  style={{ 
                    position: "absolute", 
                    bottom: "2px", 
                    right: "2px", 
                    width: "30px", 
                    height: "30px", 
                    background: "linear-gradient(135deg, #FF7518 0%, #EA580C 100%)", 
                    border: "3px solid #0c0c0e", 
                    borderRadius: "50%", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.6), 0 0 10px rgba(255,96,0,0.4)",
                    zIndex: 10
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>

              <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "4px", textAlign: "center" }}>{fullName}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#9ca3af", fontSize: "14px", marginBottom: "20px" }}>
                @{username}
              </div>

              {/* Badges */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap", justifyContent: "center" }}>
                <div style={{ background: "rgba(255,96,0,0.1)", color: "var(--orange)", padding: "4px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: 600 }}>{roleName}</div>
                <div style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af", padding: "4px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: 600 }}>✓ Verified Contributor</div>
              </div>

              {/* ID Card Banner */}
              <div style={{ width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                  <div style={{ width: "40px", height: "40px", background: "rgba(255,255,255,0.1)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>OSCG 2026 ID Card</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{badgesCreated}/3 badges created</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <Link href="/badge" style={{ flex: 1, textDecoration: "none" }}>
                    <button style={{ width: "100%", background: "var(--orange)", color: "white", padding: "10px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, transition: "all 0.2s", cursor: "pointer", border: "none" }}>
                      Customize Badge
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Stats & Charts */}
          <div className="md:col-span-1 xl:col-span-2" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Rank / Score Card */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "24px", padding: "clamp(20px, 4vw, 32px)", position: "relative" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                 <div>
                   <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9ca3af", fontSize: "12px", fontWeight: 600, marginBottom: "8px", letterSpacing: "0.05em" }}>
                     <span style={{ color: "var(--orange)" }}></span> TOTAL MERIT SCORE
                   </div>
                   <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                     <div style={{ fontSize: "48px", fontWeight: 800, color: "var(--orange)" }}>{totalPoints}</div>
                     <span style={{ color: "#9ca3af", fontSize: "14px" }}>pts</span>
                   </div>
                 </div>
                 <div style={{ textAlign: "right" }}>
                   <Link href="/leaderboard" style={{ color: "var(--orange)", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>
                     View Leaderboard →
                   </Link>
                 </div>
               </div>

               {/* Stat Pills */}
               <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "16px", marginTop: "24px" }}>
                 <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px" }}>
                   <div style={{ color: "var(--orange)", fontSize: "20px", fontWeight: 700, marginBottom: "4px" }}>{mergedPRs}</div>
                   <div style={{ color: "#9ca3af", fontSize: "11px" }}>Merged PRs</div>
                 </div>
                 <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px" }}>
                   <div style={{ color: "#38bdf8", fontSize: "20px", fontWeight: 700, marginBottom: "4px" }}>{projectsCount}</div>
                   <div style={{ color: "#9ca3af", fontSize: "11px" }}>Projects Contributed</div>
                 </div>
                 <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px" }}>
                   <div style={{ color: "#f59e0b", fontSize: "20px", fontWeight: 700, marginBottom: "4px" }}>{badgesCreated}/3</div>
                   <div style={{ color: "#9ca3af", fontSize: "11px" }}>Badges Generated</div>
                 </div>
               </div>
            </div>

            {/* Tech Stack */}
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <TechStack initialStack={profile?.tech_stack || []} providerAccountId={githubUsername} />
            </div>
          </div>
        </div>

        {/* Section Divider */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "16px", margin: "48px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", letterSpacing: "0.1em" }}>ACTIVITY</div>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)" }} />
        </div>

        {/* Contribution Activity Section */}
        <div style={{ width: "100%", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Contribution Activity</h2>
          <p style={{ color: "#9ca3af", fontSize: "14px" }}>Daily tracked open-source activity across repositories</p>
        </div>

        <div style={{ width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "24px", padding: "clamp(16px, 4vw, 32px)", marginBottom: "48px", overflowX: "auto" }}>
          <ActivityMatrix providerAccountId={githubUsername} />
        </div>

        {/* Section Divider */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "16px", margin: "24px 0 48px" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", letterSpacing: "0.1em" }}>CONTRIBUTIONS</div>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)" }} />
        </div>

        {/* Verified PRs Section */}
        <div style={{ width: "100%", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Verified PR Contributions</h2>
            <p style={{ color: "#9ca3af", fontSize: "14px" }}>Merged pull requests tracked across official competition repositories</p>
          </div>
          <span style={{ fontSize: "12px", background: "rgba(255,117,24,0.1)", color: "var(--orange)", padding: "4px 12px", borderRadius: "12px", fontWeight: 600, border: "1px solid rgba(255,117,24,0.2)" }}>
            {userContributions?.length || 0} Merged PRs
          </span>
        </div>

        {userContributions && userContributions.length > 0 ? (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "48px" }}>
            {userContributions.map((c: any) => {
              const project = Array.isArray(c.projects) ? c.projects[0] : c.projects;
              const projectName = project?.name || "Official Project";
              const prMatch = c.github_url?.match(/\/pull\/(\d+)/);
              const prNumber = prMatch ? `#${prMatch[1]}` : "PR";
              const points = c.points_awarded || 10;
              let diffLabel = "Easy";
              let diffColor = "#34d399";
              let diffBg = "rgba(52,211,153,0.1)";
              let diffBorder = "rgba(52,211,153,0.25)";

              if (points >= 50) {
                diffLabel = "Expert";
                diffColor = "#f59e0b";
                diffBg = "rgba(245,158,11,0.1)";
                diffBorder = "rgba(245,158,11,0.25)";
              } else if (points >= 30) {
                diffLabel = "Hard";
                diffColor = "#c084fc";
                diffBg = "rgba(192,132,252,0.1)";
                diffBorder = "rgba(192,132,252,0.25)";
              } else if (points >= 20) {
                diffLabel = "Medium";
                diffColor = "#38bdf8";
                diffBg = "rgba(56,189,248,0.1)";
                diffBorder = "rgba(56,189,248,0.25)";
              }

              const formattedDate = c.contributed_at
                ? new Date(c.contributed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Recent";

              return (
                <div
                  key={c.id}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: "16px",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                    transition: "border-color 0.2s",
                  }}
                  className="hover:border-[rgba(255,117,24,0.3)]"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: "240px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,117,24,0.08)", border: "1px solid rgba(255,117,24,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--orange)", flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="18" r="3"></circle>
                        <circle cx="6" cy="6" r="3"></circle>
                        <path d="M13 6h3a2 2 0 0 1 2 2v7"></path>
                        <line x1="6" y1="9" x2="6" y2="21"></line>
                      </svg>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>{projectName}</span>
                        <a
                          href={c.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--orange)", fontSize: "13px", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          className="hover:underline"
                        >
                          <span>{prNumber}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </a>
                      </div>
                      <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                        Merged on {formattedDate}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ background: diffBg, color: diffColor, border: `1px solid ${diffBorder}`, padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600 }}>
                      +{points} pts • {diffLabel}
                    </span>
                    <span style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600 }}>
                      ✓ Merged
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "24px", padding: "36px 24px", textAlign: "center", marginBottom: "48px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#9ca3af" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "6px" }}>No Verified Contributions Yet</h3>
            <p style={{ color: "#9ca3af", fontSize: "14px", maxWidth: "480px", margin: "0 auto 20px" }}>
              Contribute pull requests to any of the 17 official competition repositories. Once merged, your contributions will be verified and awarded merit points!
            </p>
            <Link href="/projects" style={{ textDecoration: "none" }}>
              <button style={{ background: "var(--orange)", color: "white", padding: "10px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer" }}>
                Browse Open Projects →
              </button>
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
