import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import ActivityMatrix from "../components/ActivityMatrix";
import TechStack from "../components/TechStack";
import { syncGitHubContribution } from "@/lib/actions/github";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const admin = createAdminClient();

  // Fetch unified profile from profiles table
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const roleName = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : "Contributor";
  const fullName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "Contributor";
  const username = profile?.github || user.user_metadata?.user_name || user.email?.split("@")[0] || "user";
  const avatar = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const totalPoints = profile?.score || 0;
  const mergedPRs = profile?.merged_prs || 0;
  const projectsCount = profile?.projects_count || 0;
  const badgesCreated = profile?.badges_created || 0;
  const isProjectAdmin = profile?.role === "project-admin";
  const isSuperAdmin = profile?.is_admin || profile?.role === "admin";

  // Lazy Background GitHub Sync (Workflow 2 from plan.md)
  if (profile?.github && profile?.role === "contributor") {
    syncGitHubContribution(user.id, profile.github).catch((err) => {
      console.error("Lazy background sync error:", err);
    });
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-white">
      <Navbar />
      <div style={{ height: "96px", width: "100%", flexShrink: 0 }} aria-hidden="true" />

      <main className="flex-grow flex flex-col items-center" style={{ margin: "0 auto", maxWidth: "1440px", width: "100%", paddingBottom: "96px", paddingTop: "24px", paddingLeft: "clamp(20px, 5vw, 64px)", paddingRight: "clamp(20px, 5vw, 64px)", overflowX: "hidden", boxSizing: "border-box" }}>
        
        {/* Header */}
        <div style={{ width: "100%", marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,96,0,0.1)", color: "var(--orange)", padding: "4px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: 600, marginBottom: "20px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--orange)" }} />
              Command Center Active
            </div>
            <h1 style={{ fontSize: "clamp(32px, 8vw, 40px)", fontWeight: 800, marginBottom: "8px", letterSpacing: "-0.02em" }}>Developer Dashboard</h1>
            <p style={{ color: "#9ca3af", fontSize: "15px" }}>Your open source journey, verified scores, and active badges.</p>
          </div>

          {isSuperAdmin && (
            <Link href="/admin" style={{ textDecoration: "none" }}>
              <button style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "10px 20px", borderRadius: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                🛡️ Access Admin Portal
              </button>
            </Link>
          )}
        </div>

        {/* Top Grid Area (Profile + Stats) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full mb-12">
          
          {/* LEFT COLUMN: Profile info */}
          <div className="md:col-span-1 xl:col-span-1" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Main Profile Card */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "24px", padding: "clamp(24px, 4vw, 40px) 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: "120px", height: "120px", borderRadius: "50%", border: "2px solid var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px", fontWeight: 800, color: "white", marginBottom: "20px", position: "relative", overflow: "hidden" }}>
                {avatar ? (
                  <img src={avatar} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span>{fullName[0] || "U"}</span>
                )}
                <div style={{ position: "absolute", bottom: "0", right: "0", background: "var(--bg)", borderRadius: "50%", padding: "4px" }}>
                  <div style={{ width: "24px", height: "24px", background: "var(--orange)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
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
                     <span style={{ color: "var(--orange)" }}>🏆</span> TOTAL MERIT SCORE
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
              <TechStack initialStack={[]} providerAccountId={profile?.github} />
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
          <ActivityMatrix providerAccountId={profile?.github} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
