"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  ProjectAdminData,
  ProjectAdminProject,
  ProjectAdminContributor,
  ProjectAdminPR,
  awardContributorPointsAction,
  syncContributorPRsAction,
} from "@/lib/actions/project-admin";

interface ProjectAdminUIProps {
  initialData: ProjectAdminData;
}

// Icons
function RepoIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 6h10" />
      <path d="M6 10h10" />
    </svg>
  );
}

function UsersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function GitPullRequestIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" x2="6" y1="9" y2="21" />
    </svg>
  );
}

function AwardIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

function StarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function GitForkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="6" r="3" />
      <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" />
      <path d="M12 12v3" />
    </svg>
  );
}

function ExternalLinkIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="3" />
    </svg>
  );
}

function RefreshIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default function ProjectAdminUI({ initialData }: ProjectAdminUIProps) {
  const [data, setData] = useState<ProjectAdminData>(initialData);
  const [activeTab, setActiveTab] = useState<"repos" | "contributors" | "prs">("contributors");
  const [isPending, startTransition] = useTransition();

  // Search & Filter state
  const [contributorSearch, setContributorSearch] = useState("");
  const [contributorRepoFilter, setContributorRepoFilter] = useState("all");
  const [prSearch, setPrSearch] = useState("");
  const [prRepoFilter, setPrRepoFilter] = useState("all");
  const [prDiffFilter, setPrDiffFilter] = useState<"all" | "easy" | "medium" | "hard" | "expert">("all");

  // Award Points Modal State
  const [awardModalUser, setAwardModalUser] = useState<ProjectAdminContributor | null>(null);
  const [awardPointsInput, setAwardPointsInput] = useState<number>(10);
  const [awardReasonInput, setAwardReasonInput] = useState("");
  const [awardLoading, setAwardLoading] = useState(false);

  // Syncing state per user
  const [syncingUserIds, setSyncingUserIds] = useState<Record<string, boolean>>({});

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Filtered Contributors
  const filteredContributors = useMemo(() => {
    return data.contributors.filter((c) => {
      const q = contributorSearch.toLowerCase().trim();
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.github || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q);

      const matchesRepo =
        contributorRepoFilter === "all" ||
        c.repoNames.some((r) => r.toLowerCase().includes(contributorRepoFilter.toLowerCase()));

      return matchesQuery && matchesRepo;
    });
  }, [data.contributors, contributorSearch, contributorRepoFilter]);

  // Filtered PRs
  const filteredPRs = useMemo(() => {
    return data.pullRequests.filter((pr) => {
      const q = prSearch.toLowerCase().trim();
      const matchesQuery =
        !q ||
        pr.title.toLowerCase().includes(q) ||
        pr.prNumber.includes(q) ||
        pr.contributorName.toLowerCase().includes(q) ||
        (pr.contributorGithub || "").toLowerCase().includes(q);

      const matchesRepo =
        prRepoFilter === "all" ||
        pr.repoName.toLowerCase().includes(prRepoFilter.toLowerCase()) ||
        pr.repoSlug.toLowerCase().includes(prRepoFilter.toLowerCase());

      const matchesDiff = prDiffFilter === "all" || pr.difficulty === prDiffFilter;

      return matchesQuery && matchesRepo && matchesDiff;
    });
  }, [data.pullRequests, prSearch, prRepoFilter, prDiffFilter]);

  // Handle Award Points
  const handleAwardPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardModalUser) return;

    if (!awardPointsInput || isNaN(awardPointsInput) || awardPointsInput <= 0) {
      showToast("Please enter a valid positive number of points.", "error");
      return;
    }

    setAwardLoading(true);
    try {
      const res = await awardContributorPointsAction(
        awardModalUser.id,
        Number(awardPointsInput),
        awardReasonInput.trim()
      );

      if (res.success) {
        showToast(
          `Awarded +${awardPointsInput} points to ${awardModalUser.name}! Total: ${res.newScore} pts`,
          "success"
        );

        // Update local state smoothly
        setData((prev) => {
          const updatedContribs = prev.contributors.map((c) => {
            if (c.id === awardModalUser.id) {
              return {
                ...c,
                pointsOnRepo: c.pointsOnRepo + Number(awardPointsInput),
                totalScore: res.newScore ?? c.totalScore + Number(awardPointsInput),
              };
            }
            return c;
          });

          return {
            ...prev,
            contributors: updatedContribs,
            metrics: {
              ...prev.metrics,
              totalPointsAwarded: prev.metrics.totalPointsAwarded + Number(awardPointsInput),
            },
          };
        });

        setAwardModalUser(null);
        setAwardReasonInput("");
      } else {
        showToast(res.error || "Failed to award points.", "error");
      }
    } catch {
      showToast("An unexpected error occurred while awarding points.", "error");
    } finally {
      setAwardLoading(false);
    }
  };

  // Handle Sync Single Contributor
  const handleSyncContributor = (contributor: ProjectAdminContributor) => {
    if (!contributor.github) {
      showToast("This contributor does not have a linked GitHub handle.", "error");
      return;
    }

    setSyncingUserIds((prev) => ({ ...prev, [contributor.id]: true }));

    startTransition(async () => {
      try {
        const res = await syncContributorPRsAction(contributor.id, contributor.github!);
        if (res.success) {
          showToast(res.message || `Synced GitHub PRs for @${contributor.github}!`, "success");
        } else {
          showToast(res.error || "Failed to sync PRs for contributor.", "error");
        }
      } catch {
        showToast("Error occurred during GitHub sync.", "error");
      } finally {
        setSyncingUserIds((prev) => ({ ...prev, [contributor.id]: false }));
      }
    });
  };

  // Handle Switch Admin (Super Admin view)
  const handleSwitchAdmin = (adminGithub: string) => {
    startTransition(async () => {
      try {
        const { getProjectAdminData } = await import("@/lib/actions/project-admin");
        const fresh = await getProjectAdminData(adminGithub);
        setData(fresh);
        showToast(
          adminGithub === "all"
            ? "Showing all competition repositories"
            : `Switched view to @${adminGithub}`,
          "info"
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to switch project admin";
        showToast(msg, "error");
      }
    });
  };

  const viewerProfilePayload = {
    id: data.currentUser.id,
    name: data.currentUser.name,
    email: data.currentUser.email || undefined,
    avatar: null,
    role: data.currentUser.role,
    isAdmin: data.currentUser.isSuperAdmin,
    github: data.currentUser.github || null,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050507",
        backgroundImage:
          "radial-gradient(ellipse 800px 450px at 80% -5%, rgba(255, 117, 24, 0.1), transparent 75%), radial-gradient(ellipse 600px 300px at 10% 20%, rgba(168, 85, 247, 0.05), transparent 70%)",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#ffffff",
      }}
    >
      <Navbar initialProfile={viewerProfilePayload} />
      <div style={{ height: "96px", width: "100%", flexShrink: 0 }} aria-hidden="true" />

      {/* Main Container */}
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
          gap: "28px",
        }}
      >
        {/* Toast Banner */}
        {toast && (
          <div
            style={{
              position: "fixed",
              bottom: "28px",
              right: "28px",
              zIndex: 9999,
              background:
                toast.type === "success"
                  ? "rgba(16, 185, 129, 0.95)"
                  : toast.type === "error"
                  ? "rgba(239, 68, 68, 0.95)"
                  : "rgba(30, 41, 59, 0.95)",
              color: "white",
              padding: "12px 20px",
              borderRadius: "12px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "14px",
              fontWeight: 600,
              backdropFilter: "blur(8px)",
              animation: "slideIn 0.2s ease-out",
            }}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "16px", padding: 0 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Header & Context Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            paddingBottom: "24px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255, 117, 24, 0.12)",
                  border: "1px solid rgba(255, 117, 24, 0.3)",
                  color: "#FF8822",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#FF7518",
                    boxShadow: "0 0 8px #FF7518",
                  }}
                />
                Project Admin Portal
              </span>

              {data.currentUser.isSuperAdmin && (
                <span
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#f87171",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  Super Admin View
                </span>
              )}
            </div>

            <h1
              style={{
                fontSize: "clamp(26px, 4vw, 34px)",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.02em",
                margin: "0 0 6px 0",
              }}
            >
              Repository & Contributor Command Center
            </h1>

            <p style={{ fontSize: "14px", color: "#9ca3af", margin: 0 }}>
              Oversee your tracked repositories, inspect contributor pull requests, and award merit recognition.
            </p>
          </div>

          {/* Quick Actions & Super Admin Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {data.currentUser.isSuperAdmin && data.allProjectAdmins && data.allProjectAdmins.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px", color: "#9ca3af" }}>Project Admin:</span>
                <select
                  value={data.selectedAdminGithub || "all"}
                  onChange={(e) => handleSwitchAdmin(e.target.value)}
                  style={{
                    background: "#121217",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    fontSize: "13px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">All Managed Projects</option>
                  {data.allProjectAdmins.map((pa) => (
                    <option key={pa.id} value={pa.github || ""}>
                      {pa.name} (@{pa.github || "no-handle"}) — {pa.repoCount} repo(s)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {data.currentUser.isSuperAdmin && (
              <Link
                href="/admin"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#d1d5db",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
                className="hover:border-white/40 hover:text-white"
              >
                <span>Admin Portal</span>
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </Link>
            )}

            <Link
              href="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 117, 24, 0.1)",
                border: "1px solid rgba(255, 117, 24, 0.25)",
                color: "#FF8822",
                padding: "8px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.2s",
              }}
              className="hover:bg-[rgba(255,117,24,0.18)] hover:border-[rgba(255,117,24,0.45)]"
            >
              <span>Personal Dashboard</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "18px",
            width: "100%",
          }}
        >
          {/* Stat 1: Managed Repositories */}
          <div
            style={{
              background: "linear-gradient(180deg, rgba(20, 20, 26, 0.8) 0%, rgba(12, 12, 16, 0.9) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: "#9ca3af", fontWeight: 500 }}>Managed Repos</span>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: "rgba(255, 117, 24, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FF7518",
                }}
              >
                <RepoIcon className="w-4 h-4" />
              </div>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
              {data.metrics.totalRepos}
            </div>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>Active participating repositories</span>
          </div>

          {/* Stat 2: Active Contributors */}
          <div
            style={{
              background: "linear-gradient(180deg, rgba(20, 20, 26, 0.8) 0%, rgba(12, 12, 16, 0.9) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: "#9ca3af", fontWeight: 500 }}>Active Contributors</span>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: "rgba(59, 130, 246, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#3b82f6",
                }}
              >
                <UsersIcon className="w-4 h-4" />
              </div>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
              {data.metrics.totalContributors}
            </div>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>Contributors with merged PRs</span>
          </div>

          {/* Stat 3: Merged PRs */}
          <div
            style={{
              background: "linear-gradient(180deg, rgba(20, 20, 26, 0.8) 0%, rgba(12, 12, 16, 0.9) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: "#9ca3af", fontWeight: 500 }}>Merged Pull Requests</span>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#10b981",
                }}
              >
                <GitPullRequestIcon className="w-4 h-4" />
              </div>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
              {data.metrics.totalPRs}
            </div>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>Verified OSCI'26 submissions</span>
          </div>

          {/* Stat 4: Points Distributed */}
          <div
            style={{
              background: "linear-gradient(180deg, rgba(20, 20, 26, 0.8) 0%, rgba(12, 12, 16, 0.9) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: "#9ca3af", fontWeight: 500 }}>Points Distributed</span>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: "rgba(168, 85, 247, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#a855f7",
                }}
              >
                <AwardIcon className="w-4 h-4" />
              </div>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#FF7518", letterSpacing: "-0.02em" }}>
              {data.metrics.totalPointsAwarded.toLocaleString()}
            </div>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>Total merit points across repos</span>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(18, 18, 23, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "5px",
            borderRadius: "14px",
            width: "fit-content",
          }}
        >
          <button
            onClick={() => setActiveTab("contributors")}
            style={{
              background: activeTab === "contributors" ? "linear-gradient(135deg, #FF7518 0%, #FF5500 100%)" : "transparent",
              color: activeTab === "contributors" ? "white" : "#9ca3af",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: activeTab === "contributors" ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: activeTab === "contributors" ? "0 2px 10px rgba(255,117,24,0.3)" : "none",
            }}
          >
            <UsersIcon className="w-4 h-4" />
            <span>Contributors</span>
            <span
              style={{
                background: activeTab === "contributors" ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.08)",
                padding: "2px 7px",
                borderRadius: "10px",
                fontSize: "11px",
              }}
            >
              {data.contributors.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("prs")}
            style={{
              background: activeTab === "prs" ? "linear-gradient(135deg, #FF7518 0%, #FF5500 100%)" : "transparent",
              color: activeTab === "prs" ? "white" : "#9ca3af",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: activeTab === "prs" ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: activeTab === "prs" ? "0 2px 10px rgba(255,117,24,0.3)" : "none",
            }}
          >
            <GitPullRequestIcon className="w-4 h-4" />
            <span>Pull Requests</span>
            <span
              style={{
                background: activeTab === "prs" ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.08)",
                padding: "2px 7px",
                borderRadius: "10px",
                fontSize: "11px",
              }}
            >
              {data.pullRequests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("repos")}
            style={{
              background: activeTab === "repos" ? "linear-gradient(135deg, #FF7518 0%, #FF5500 100%)" : "transparent",
              color: activeTab === "repos" ? "white" : "#9ca3af",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: activeTab === "repos" ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: activeTab === "repos" ? "0 2px 10px rgba(255,117,24,0.3)" : "none",
            }}
          >
            <RepoIcon className="w-4 h-4" />
            <span>My Repositories</span>
            <span
              style={{
                background: activeTab === "repos" ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.08)",
                padding: "2px 7px",
                borderRadius: "10px",
                fontSize: "11px",
              }}
            >
              {data.managedProjects.length}
            </span>
          </button>
        </div>

        {/* TAB 1: CONTRIBUTORS TABLE */}
        {activeTab === "contributors" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
            {/* Search & Filter Bar */}
            <div
              style={{
                display: "flex",
                gap: "14px",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {/* Search Box */}
              <div style={{ position: "relative", flex: 1, minWidth: "280px" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#6b7280",
                    pointerEvents: "none",
                  }}
                >
                  <SearchIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search contributors by name, GitHub handle, or email..."
                  value={contributorSearch}
                  onChange={(e) => setContributorSearch(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#111115",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                    padding: "11px 18px 11px 40px",
                    color: "white",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
                {contributorSearch && (
                  <button
                    onClick={() => setContributorSearch("")}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#9ca3af",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Repo Filter */}
              {data.managedProjects.length > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", color: "#9ca3af" }}>Repository:</span>
                  <select
                    value={contributorRepoFilter}
                    onChange={(e) => setContributorRepoFilter(e.target.value)}
                    style={{
                      background: "#111115",
                      color: "white",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      fontSize: "13px",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="all">All Repositories</option>
                    {data.managedProjects.map((p) => (
                      <option key={p.id} value={p.name.split("–")[0].trim()}>
                        {p.name.split("–")[0].trim()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Contributors Table Card */}
            <div
              style={{
                background: "linear-gradient(180deg, #101014 0%, #0c0c0f 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "18px",
                overflow: "hidden",
                boxShadow: "0 12px 35px rgba(0, 0, 0, 0.4)",
              }}
            >
              {filteredContributors.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#9ca3af" }}>
                  <UsersIcon className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "white", marginBottom: "6px" }}>
                    No contributors found
                  </div>
                  <p style={{ fontSize: "13px", color: "#6b7280", margin: 0, maxWidth: "420px", marginInline: "auto" }}>
                    {contributorSearch || contributorRepoFilter !== "all"
                      ? "Try adjusting your search criteria or repository filter."
                      : "Once contributors submit and merge pull requests carrying the OSCI'26 label on your repository, they will appear here automatically."}
                  </p>
                </div>
              ) : (
                <div style={{ width: "100%", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                          background: "rgba(255, 255, 255, 0.02)",
                          color: "#9ca3af",
                          fontSize: "12px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        <th style={{ padding: "14px 20px" }}>Contributor</th>
                        <th style={{ padding: "14px 16px" }}>Repositories</th>
                        <th style={{ padding: "14px 16px", textAlign: "center" }}>PRs on Repo</th>
                        <th style={{ padding: "14px 16px", textAlign: "center" }}>Repo Points</th>
                        <th style={{ padding: "14px 16px", textAlign: "center" }}>Overall Score</th>
                        <th style={{ padding: "14px 16px" }}>Latest Merged PR</th>
                        <th style={{ padding: "14px 20px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContributors.map((c, idx) => {
                        const isSyncing = Boolean(syncingUserIds[c.id]);

                        return (
                          <tr
                            key={c.id}
                            style={{
                              borderBottom:
                                idx === filteredContributors.length - 1
                                  ? "none"
                                  : "1px solid rgba(255, 255, 255, 0.04)",
                              transition: "background 0.15s",
                            }}
                            className="hover:bg-[rgba(255,255,255,0.025)]"
                          >
                            {/* Contributor Profile */}
                            <td style={{ padding: "14px 20px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div
                                  style={{
                                    width: "38px",
                                    height: "38px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    background: "#1c1c22",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                  }}
                                >
                                  {c.avatarUrl ? (
                                    <img
                                      src={c.avatarUrl}
                                      alt={c.name}
                                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                  ) : (
                                    <span>{c.name[0] || "C"}</span>
                                  )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, color: "#ffffff", lineHeight: 1.3 }}>
                                    {c.name}
                                  </div>
                                  {c.github ? (
                                    <a
                                      href={`https://github.com/${c.github}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        color: "#FF8822",
                                        fontSize: "12px",
                                        textDecoration: "none",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                      className="hover:underline"
                                    >
                                      <span>@{c.github}</span>
                                      <ExternalLinkIcon className="w-3 h-3 opacity-70" />
                                    </a>
                                  ) : (
                                    <span style={{ fontSize: "12px", color: "#6b7280" }}>No GitHub link</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Repositories */}
                            <td style={{ padding: "14px 16px" }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                                {c.repoNames.map((r) => (
                                  <span
                                    key={r}
                                    style={{
                                      background: "rgba(255, 255, 255, 0.05)",
                                      border: "1px solid rgba(255, 255, 255, 0.08)",
                                      color: "#d1d5db",
                                      padding: "3px 8px",
                                      borderRadius: "6px",
                                      fontSize: "11.5px",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* PRs on this repo */}
                            <td style={{ padding: "14px 16px", textAlign: "center" }}>
                              <span
                                style={{
                                  background: "rgba(16, 185, 129, 0.1)",
                                  color: "#34d399",
                                  border: "1px solid rgba(16, 185, 129, 0.25)",
                                  padding: "3px 10px",
                                  borderRadius: "12px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                }}
                              >
                                {c.prCountOnRepo} PRs
                              </span>
                            </td>

                            {/* Repo Points */}
                            <td style={{ padding: "14px 16px", textAlign: "center" }}>
                              <span
                                style={{
                                  color: "#FF7518",
                                  fontWeight: 800,
                                  fontSize: "14px",
                                }}
                              >
                                +{c.pointsOnRepo} pts
                              </span>
                            </td>

                            {/* Overall Score */}
                            <td style={{ padding: "14px 16px", textAlign: "center" }}>
                              <span style={{ color: "#d1d5db", fontWeight: 600 }}>
                                {c.totalScore.toLocaleString()}
                              </span>
                            </td>

                            {/* Latest Merged PR */}
                            <td style={{ padding: "14px 16px", maxWidth: "260px" }}>
                              {c.latestPrTitle ? (
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {c.latestPrUrl ? (
                                    <a
                                      href={c.latestPrUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        color: "#9ca3af",
                                        textDecoration: "none",
                                        fontSize: "12.5px",
                                      }}
                                      className="hover:text-white hover:underline"
                                      title={c.latestPrTitle}
                                    >
                                      {c.latestPrTitle}
                                    </a>
                                  ) : (
                                    <span style={{ color: "#9ca3af", fontSize: "12.5px" }}>{c.latestPrTitle}</span>
                                  )}
                                  {c.latestPrDate && (
                                    <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                                      {new Date(c.latestPrDate).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: "#6b7280", fontSize: "12px" }}>None yet</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: "14px 20px", textAlign: "right" }}>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                                {/* Award Points Button */}
                                <button
                                  onClick={() => {
                                    setAwardModalUser(c);
                                    setAwardPointsInput(10);
                                  }}
                                  style={{
                                    background: "linear-gradient(135deg, rgba(255,117,24,0.18) 0%, rgba(255,85,0,0.18) 100%)",
                                    border: "1px solid rgba(255, 117, 24, 0.4)",
                                    color: "#FF8822",
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    transition: "all 0.15s ease",
                                  }}
                                  className="hover:border-[#FF7518] hover:bg-[rgba(255,117,24,0.3)]"
                                  title="Award merit bonus points to this contributor"
                                >
                                  <AwardIcon className="w-3.5 h-3.5" />
                                  <span>Give Points</span>
                                </button>

                                {/* Sync PRs Button */}
                                {c.github && (
                                  <button
                                    onClick={() => handleSyncContributor(c)}
                                    disabled={isSyncing}
                                    style={{
                                      background: "rgba(255, 255, 255, 0.05)",
                                      border: "1px solid rgba(255, 255, 255, 0.1)",
                                      color: "#d1d5db",
                                      padding: "6px 10px",
                                      borderRadius: "8px",
                                      fontSize: "12px",
                                      cursor: isSyncing ? "not-allowed" : "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      opacity: isSyncing ? 0.6 : 1,
                                      transition: "all 0.15s ease",
                                    }}
                                    className="hover:text-white hover:border-white/30"
                                    title="Synchronize fresh GitHub PRs for this contributor"
                                  >
                                    <RefreshIcon className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                                    <span>{isSyncing ? "Syncing..." : "Sync"}</span>
                                  </button>
                                )}

                                {/* Filter PRs shortcut */}
                                <button
                                  onClick={() => {
                                    setPrSearch(c.github || c.name);
                                    setActiveTab("prs");
                                  }}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "#9ca3af",
                                    padding: "6px",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                  }}
                                  className="hover:text-white"
                                  title="View all pull requests by this contributor"
                                >
                                  <GitPullRequestIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PULL REQUESTS TABLE */}
        {activeTab === "prs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
            {/* Filters Row */}
            <div
              style={{
                display: "flex",
                gap: "14px",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {/* Search Box */}
              <div style={{ position: "relative", flex: 1, minWidth: "280px" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#6b7280",
                    pointerEvents: "none",
                  }}
                >
                  <SearchIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search PRs by title, #number, author, or repository..."
                  value={prSearch}
                  onChange={(e) => setPrSearch(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#111115",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                    padding: "11px 18px 11px 40px",
                    color: "white",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
                {prSearch && (
                  <button
                    onClick={() => setPrSearch("")}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#9ca3af",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Difficulty Pills */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  background: "rgba(255,255,255,0.02)",
                  padding: "4px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {(["all", "easy", "medium", "hard", "expert"] as const).map((diff) => {
                  const isActive = prDiffFilter === diff;
                  return (
                    <button
                      key={diff}
                      onClick={() => setPrDiffFilter(diff)}
                      style={{
                        background: isActive ? "rgba(255, 117, 24, 0.15)" : "transparent",
                        color: isActive ? "#FF8822" : "#9ca3af",
                        border: isActive ? "1px solid rgba(255, 117, 24, 0.4)" : "1px solid transparent",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: isActive ? 700 : 500,
                        cursor: "pointer",
                        textTransform: "capitalize",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {diff === "all" ? "All Levels" : diff}
                    </button>
                  );
                })}
              </div>

              {/* Repo Filter */}
              {data.managedProjects.length > 1 && (
                <select
                  value={prRepoFilter}
                  onChange={(e) => setPrRepoFilter(e.target.value)}
                  style={{
                    background: "#111115",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    fontSize: "13px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">All Repositories</option>
                  {data.managedProjects.map((p) => (
                    <option key={p.id} value={p.name.split("–")[0].trim()}>
                      {p.name.split("–")[0].trim()}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* PRs Table Card */}
            <div
              style={{
                background: "linear-gradient(180deg, #101014 0%, #0c0c0f 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "18px",
                overflow: "hidden",
                boxShadow: "0 12px 35px rgba(0, 0, 0, 0.4)",
              }}
            >
              {filteredPRs.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#9ca3af" }}>
                  <GitPullRequestIcon className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "white", marginBottom: "6px" }}>
                    No pull requests found
                  </div>
                  <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                    {prSearch || prRepoFilter !== "all" || prDiffFilter !== "all"
                      ? "No pull requests match the current filters."
                      : "Verified merged pull requests from your repositories will appear here."}
                  </p>
                </div>
              ) : (
                <div style={{ width: "100%", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                          background: "rgba(255, 255, 255, 0.02)",
                          color: "#9ca3af",
                          fontSize: "12px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        <th style={{ padding: "14px 20px" }}>Pull Request</th>
                        <th style={{ padding: "14px 16px" }}>Author</th>
                        <th style={{ padding: "14px 16px" }}>Repository</th>
                        <th style={{ padding: "14px 16px", textAlign: "center" }}>Difficulty</th>
                        <th style={{ padding: "14px 16px", textAlign: "center" }}>Points</th>
                        <th style={{ padding: "14px 16px" }}>Merged Date</th>
                        <th style={{ padding: "14px 20px", textAlign: "right" }}>GitHub</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPRs.map((pr, idx) => {
                        const diffColors = {
                          expert: { bg: "rgba(168, 85, 247, 0.12)", text: "#c084fc", border: "rgba(168, 85, 247, 0.3)" },
                          hard: { bg: "rgba(239, 68, 68, 0.12)", text: "#f87171", border: "rgba(239, 68, 68, 0.3)" },
                          medium: { bg: "rgba(245, 158, 11, 0.12)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" },
                          easy: { bg: "rgba(16, 185, 129, 0.12)", text: "#34d399", border: "rgba(16, 185, 129, 0.3)" },
                        }[pr.difficulty];

                        return (
                          <tr
                            key={pr.id}
                            style={{
                              borderBottom:
                                idx === filteredPRs.length - 1
                                  ? "none"
                                  : "1px solid rgba(255, 255, 255, 0.04)",
                              transition: "background 0.15s",
                            }}
                            className="hover:bg-[rgba(255,255,255,0.025)]"
                          >
                            {/* PR Title & Status */}
                            <td style={{ padding: "14px 20px", maxWidth: "340px" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                <span
                                  style={{
                                    background: "rgba(16, 185, 129, 0.12)",
                                    border: "1px solid rgba(16, 185, 129, 0.3)",
                                    color: "#34d399",
                                    padding: "2px 7px",
                                    borderRadius: "10px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    flexShrink: 0,
                                    marginTop: "1px",
                                  }}
                                >
                                  Merged
                                </span>
                                <div style={{ minWidth: 0 }}>
                                  <a
                                    href={pr.githubUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: "#ffffff",
                                      fontWeight: 600,
                                      textDecoration: "none",
                                      lineHeight: 1.35,
                                      display: "inline-block",
                                    }}
                                    className="hover:text-[#FF7518] hover:underline"
                                  >
                                    {pr.title}
                                  </a>
                                </div>
                              </div>
                            </td>

                            {/* Author */}
                            <td style={{ padding: "14px 16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div
                                  style={{
                                    width: "26px",
                                    height: "26px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    background: "#1c1c22",
                                    flexShrink: 0,
                                  }}
                                >
                                  {pr.contributorAvatar ? (
                                    <img
                                      src={pr.contributorAvatar}
                                      alt={pr.contributorName}
                                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                      }}
                                    >
                                      {pr.contributorName[0] || "C"}
                                    </div>
                                  )}
                                </div>
                                <span style={{ color: "#d1d5db", fontWeight: 500 }}>
                                  {pr.contributorGithub ? `@${pr.contributorGithub}` : pr.contributorName}
                                </span>
                              </div>
                            </td>

                            {/* Repository */}
                            <td style={{ padding: "14px 16px" }}>
                              <span
                                style={{
                                  background: "rgba(255, 255, 255, 0.04)",
                                  border: "1px solid rgba(255, 255, 255, 0.08)",
                                  color: "#d1d5db",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                }}
                              >
                                {pr.repoName}
                              </span>
                            </td>

                            {/* Difficulty */}
                            <td style={{ padding: "14px 16px", textAlign: "center" }}>
                              <span
                                style={{
                                  background: diffColors.bg,
                                  color: diffColors.text,
                                  border: `1px solid ${diffColors.border}`,
                                  padding: "3px 10px",
                                  borderRadius: "12px",
                                  fontSize: "11.5px",
                                  fontWeight: 700,
                                  textTransform: "capitalize",
                                }}
                              >
                                {pr.difficulty}
                              </span>
                            </td>

                            {/* Points */}
                            <td style={{ padding: "14px 16px", textAlign: "center" }}>
                              <span style={{ color: "#FF7518", fontWeight: 800 }}>+{pr.points} pts</span>
                            </td>

                            {/* Merged Date */}
                            <td style={{ padding: "14px 16px", color: "#9ca3af", fontSize: "12.5px" }}>
                              {new Date(pr.contributedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>

                            {/* GitHub Link */}
                            <td style={{ padding: "14px 20px", textAlign: "right" }}>
                              <a
                                href={pr.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  background: "rgba(255, 255, 255, 0.05)",
                                  border: "1px solid rgba(255, 255, 255, 0.1)",
                                  color: "#d1d5db",
                                  padding: "5px 10px",
                                  borderRadius: "7px",
                                  fontSize: "12px",
                                  textDecoration: "none",
                                }}
                                className="hover:text-white hover:border-white/30"
                              >
                                <span>PR #{pr.prNumber}</span>
                                <ExternalLinkIcon className="w-3.5 h-3.5" />
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MY REPOSITORIES */}
        {activeTab === "repos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
            {data.managedProjects.length === 0 ? (
              <div
                style={{
                  background: "linear-gradient(180deg, #101014 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "18px",
                  padding: "50px 24px",
                  textAlign: "center",
                }}
              >
                <RepoIcon className="w-12 h-12 mx-auto mb-3 text-orange-500/60" />
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "white", marginBottom: "8px" }}>
                  No Linked Repositories Found
                </h3>
                <p style={{ fontSize: "14px", color: "#9ca3af", maxWidth: "520px", margin: "0 auto 20px" }}>
                  Repositories are matched automatically when their GitHub owner matches your registered GitHub
                  username (
                  <strong style={{ color: "#FF8822" }}>
                    @{data.currentUser.github || "not-configured"}
                  </strong>
                  ). If your repository belongs to an organization or has not yet been added to the competition,
                  contact the Super Admin to register it.
                </p>
                <Link
                  href="/projects"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "linear-gradient(135deg, #FF7518 0%, #FF5500 100%)",
                    color: "white",
                    padding: "10px 20px",
                    borderRadius: "10px",
                    fontWeight: 700,
                    textDecoration: "none",
                    fontSize: "14px",
                  }}
                >
                  Browse Tracked Projects Directory
                </Link>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                  gap: "20px",
                  width: "100%",
                }}
              >
                {data.managedProjects.map((proj) => (
                  <div
                    key={proj.id}
                    style={{
                      background: "linear-gradient(180deg, #121217 0%, #0d0d11 100%)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "18px",
                      padding: "24px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "18px",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                      transition: "border-color 0.2s ease, transform 0.2s ease",
                    }}
                    className="hover:border-[rgba(255,117,24,0.4)]"
                  >
                    <div>
                      {/* Top Language & Owner Tag */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#d1d5db",
                          }}
                        >
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: proj.accentColor || "#FF7518",
                            }}
                          />
                          {proj.language || "TypeScript"}
                        </span>

                        <span
                          style={{
                            background: "rgba(16, 185, 129, 0.12)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            color: "#34d399",
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          Tracked
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3
                        style={{
                          fontSize: "18px",
                          fontWeight: 700,
                          color: "#ffffff",
                          margin: "0 0 8px 0",
                          lineHeight: 1.3,
                        }}
                      >
                        {proj.name}
                      </h3>

                      <p
                        style={{
                          fontSize: "13px",
                          color: "#9ca3af",
                          lineHeight: 1.5,
                          margin: 0,
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {proj.description.replace(/<!--meta:.*?-->/, "").trim()}
                      </p>
                    </div>

                    {/* Stats Ribbon */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: "8px",
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderRadius: "12px",
                        padding: "10px",
                        textAlign: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 500 }}>Contributors</div>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: "white" }}>
                          {proj.contributorCount}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 500 }}>Merged PRs</div>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: "#34d399" }}>
                          {proj.prCount}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 500 }}>Points</div>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: "#FF7518" }}>
                          {proj.totalPoints}
                        </div>
                      </div>
                    </div>

                    {/* Action Links */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <a
                        href={proj.githubRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          color: "white",
                          padding: "9px",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: 600,
                          textDecoration: "none",
                          transition: "all 0.15s ease",
                        }}
                        className="hover:border-white/40 hover:bg-[rgba(255,255,255,0.08)]"
                      >
                        <span>GitHub Repo</span>
                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => {
                          setContributorRepoFilter(proj.name.split("–")[0].trim());
                          setActiveTab("contributors");
                        }}
                        style={{
                          background: "rgba(255, 117, 24, 0.1)",
                          border: "1px solid rgba(255, 117, 24, 0.3)",
                          color: "#FF8822",
                          padding: "9px 14px",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        className="hover:bg-[rgba(255,117,24,0.2)]"
                      >
                        View Contributors
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AWARD POINTS MODAL */}
        {awardModalUser && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "460px",
                background: "linear-gradient(180deg, #15151b 0%, #0d0d11 100%)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "20px",
                padding: "28px",
                boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8)",
                position: "relative",
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setAwardModalUser(null)}
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  background: "none",
                  border: "none",
                  color: "#9ca3af",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
                className="hover:text-white"
              >
                ✕
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#1c1c22",
                    border: "2px solid #FF7518",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  {awardModalUser.avatarUrl ? (
                    <img
                      src={awardModalUser.avatarUrl}
                      alt={awardModalUser.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span>{awardModalUser.name[0] || "C"}</span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 700, color: "white" }}>
                    {awardModalUser.name}
                  </div>
                  <div style={{ fontSize: "13px", color: "#FF8822" }}>
                    {awardModalUser.github ? `@${awardModalUser.github}` : "Contributor"} · Current Score:{" "}
                    {awardModalUser.totalScore} pts
                  </div>
                </div>
              </div>

              <form onSubmit={handleAwardPointsSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#9ca3af", marginBottom: "8px" }}>
                    Select Point Preset or Custom Value
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginBottom: "12px" }}>
                    {[5, 10, 20, 30, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAwardPointsInput(preset)}
                        style={{
                          background:
                            awardPointsInput === preset
                              ? "linear-gradient(135deg, #FF7518 0%, #FF5500 100%)"
                              : "rgba(255, 255, 255, 0.05)",
                          color: awardPointsInput === preset ? "white" : "#d1d5db",
                          border: awardPointsInput === preset ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                          padding: "10px 0",
                          borderRadius: "10px",
                          fontWeight: 700,
                          fontSize: "13px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>

                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={awardPointsInput}
                      onChange={(e) => setAwardPointsInput(Number(e.target.value))}
                      style={{
                        width: "100%",
                        background: "#0c0c10",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "10px",
                        padding: "10px 14px",
                        color: "white",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                      placeholder="Custom points value"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#9ca3af", marginBottom: "6px" }}>
                    Milestone or Recognition Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={awardReasonInput}
                    onChange={(e) => setAwardReasonInput(e.target.value)}
                    placeholder="e.g. Exceptional documentation, great review feedback..."
                    style={{
                      width: "100%",
                      background: "#0c0c10",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      color: "white",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setAwardModalUser(null)}
                    style={{
                      flex: 1,
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#d1d5db",
                      padding: "12px",
                      borderRadius: "10px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={awardLoading}
                    style={{
                      flex: 2,
                      background: "linear-gradient(135deg, #FF7518 0%, #FF5500 100%)",
                      border: "none",
                      color: "white",
                      padding: "12px",
                      borderRadius: "10px",
                      fontWeight: 700,
                      cursor: awardLoading ? "not-allowed" : "pointer",
                      opacity: awardLoading ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 14px rgba(255, 117, 24, 0.4)",
                    }}
                  >
                    {awardLoading ? (
                      <>
                        <div style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                        <span>Awarding...</span>
                      </>
                    ) : (
                      <>
                        <AwardIcon className="w-4 h-4" />
                        <span>Award +{awardPointsInput} Points</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
