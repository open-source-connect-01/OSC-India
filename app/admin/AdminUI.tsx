"use client";

import React, { useState, useTransition, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Profile } from "@/lib/supabase/database";
import { updateUserRole, updateUserScore, updateUserGithub, syncSingleUser, syncAllUsers, adminLogoutAction } from "@/lib/actions/admin";

// Icons
function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function RefreshCwIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function GitPullRequestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

interface AdminUIProps {
  initialProfiles: Profile[];
  initialMetrics: {
    totalUsers: number;
    contributors: number;
    mentors: number;
    projectAdmins: number;
    admins: number;
    totalPRs: number;
    totalScore: number;
  };
}

export default function AdminUI({ initialProfiles, initialMetrics }: AdminUIProps) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [toastPaused, setToastPaused] = useState(false);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setToastPaused(false);
  };

  // Auto-dismiss side toast after 4 seconds (pauses on hover)
  useEffect(() => {
    if (!toast || toastPaused) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, toastPaused]);

  // Filter profiles
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.github || "").toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === "all" || p.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Handle Role Change
  const handleRoleChange = (
    userId: string,
    newRole: "contributor" | "mentor" | "project-admin" | "admin"
  ) => {
    startTransition(async () => {
      const res = await updateUserRole(userId, newRole);
      if (res.success) {
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === userId
              ? {
                  ...p,
                  role: newRole,
                  is_admin: newRole === "admin",
                  score: newRole === "contributor" ? p.score : 0,
                  merged_prs: newRole === "contributor" ? p.merged_prs : 0,
                  projects_count: newRole === "contributor" ? p.projects_count : 0,
                }
              : p
          )
        );
        showToast(`Role updated to ${newRole} for user.`, "success");
      } else {
        showToast(res.error || "Failed to update role", "error");
      }
    });
  };

  // Handle Score Adjust
  const handleScoreAdjust = (userId: string, delta: number, mode: "add" | "set" = "add") => {
    startTransition(async () => {
      const res = await updateUserScore(userId, delta, mode);
      if (res.success) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, score: res.score || 0 } : p))
        );
        showToast("Score updated successfully.", "success");
      } else {
        showToast(res.error || "Failed to update score", "error");
      }
    });
  };

  // Handle Set/Update GitHub
  const handleSetGithub = (userId: string, currentHandle?: string | null) => {
    const handle = prompt("Enter GitHub username for this user:", currentHandle || "");
    if (!handle || !handle.trim()) return;
    const clean = handle.replace(/^@/, "").trim();
    startTransition(async () => {
      const res = await updateUserGithub(userId, clean);
      if (res.success) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, github: clean } : p))
        );
        showToast(`GitHub handle @${clean} linked successfully.`, "success");
      } else {
        showToast(res.error || "Failed to update GitHub handle", "error");
      }
    });
  };

  // Handle Single Sync
  const handleSingleSync = async (user: Profile) => {
    if (!user.github) {
      showToast("This user does not have a linked GitHub username.", "error");
      return;
    }
    setSyncingId(user.id);
    try {
      const res = await syncSingleUser(user.id, user.github);
      if (res.success) {
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === user.id
              ? {
                  ...p,
                  score: res.score ?? p.score,
                  merged_prs: res.merged_prs ?? p.merged_prs,
                  projects_count: res.projects_count ?? p.projects_count,
                }
              : p
          )
        );
        showToast(`Synced @${user.github}: ${res.score} pts (${res.merged_prs} PRs)`, "success");
      } else {
        showToast(res.error || "Failed to sync GitHub contributions.", "error");
      }
    } finally {
      setSyncingId(null);
    }
  };

  // Handle Bulk Sync
  const handleBulkSync = async () => {
    if (!confirm("This will synchronize all active contributors with a 2-second rate-limit pause per user. Proceed?")) {
      return;
    }
    setBulkSyncing(true);
    showToast("Bulk sync started in background...", "info");
    try {
      const res = await syncAllUsers();
      if (res.success) {
        showToast(`Bulk sync complete! Synced: ${res.synced}, Failed: ${res.failed}, Total: ${res.total}`, "success");
        window.location.reload();
      } else {
        showToast(res.error || "Bulk sync failed", "error");
      }
    } finally {
      setBulkSyncing(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["ID", "Name", "Email", "GitHub", "Role", "Score", "Merged PRs", "Projects Count", "Badges Created"];
    const rows = filteredProfiles.map((p) => [
      p.id,
      `"${p.full_name || ""}"`,
      p.email || "",
      p.github || "",
      p.role,
      p.score,
      p.merged_prs,
      p.projects_count,
      p.badges_created,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `OSCI_Users_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Admin Logout / Lock
  const handleAdminLogout = async () => {
    await adminLogoutAction();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#050507] flex flex-col font-sans text-white relative selection:bg-[#FF7518]/30">
      <Navbar />
      <div style={{ height: "96px", width: "100%", flexShrink: 0 }} aria-hidden="true" />

      {/* Ambient Cyber Aura Background */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{
          background: "radial-gradient(ellipse 70% 30% at 50% 120px, rgba(255, 117, 24, 0.08) 0%, rgba(5, 5, 7, 0) 70%)",
        }}
      />

      <main 
        className="flex-grow flex flex-col items-center relative z-10" 
        style={{ 
          margin: "0 auto", 
          maxWidth: "1440px", 
          width: "100%", 
          minHeight: "calc(100vh - 96px)",
          padding: "clamp(36px, 6vh, 56px) clamp(20px, 4vw, 36px) clamp(80px, 12vh, 140px)" 
        }}
      >
        {/* Header */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "36px", flexWrap: "wrap", gap: "20px" }}>
          <div>
            <div 
              style={{ 
                display: "inline-flex", 
                alignItems: "center", 
                gap: "8px", 
                background: "rgba(255, 117, 24, 0.08)", 
                border: "1px solid rgba(255, 117, 24, 0.25)", 
                color: "#FF8822", 
                padding: "5px 14px", 
                borderRadius: "20px", 
                fontSize: "11px", 
                fontWeight: 700, 
                letterSpacing: "0.08em",
                marginBottom: "14px" 
              }}
            >
              <span 
                style={{ 
                  width: "6px", 
                  height: "6px", 
                  borderRadius: "50%", 
                  background: "#FF7518", 
                  boxShadow: "0 0 8px #FF7518" 
                }} 
              />
              RESTRICTED • ADMIN COMMAND CENTER
            </div>
            <h1 style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.025em" }} className="text-white">
              Command Center
            </h1>
            <p style={{ color: "#9ca3af", fontSize: "15px", marginTop: "4px" }}>
              Manage contributors, verify GitHub roles, trigger synchronization, and adjust scoring.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={handleExportCSV}
              style={{ 
                background: "rgba(255,255,255,0.03)", 
                border: "1px solid rgba(255,255,255,0.1)", 
                color: "white", 
                padding: "10px 18px", 
                borderRadius: "12px", 
                fontSize: "13px", 
                fontWeight: 600, 
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
              className="hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] active:scale-[0.98]"
            >
              <DownloadIcon className="w-4 h-4 text-gray-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleBulkSync}
              disabled={bulkSyncing}
              style={{ 
                background: "linear-gradient(135deg, #FF7518 0%, #FF5500 100%)", 
                border: "none", 
                color: "white", 
                padding: "10px 20px", 
                borderRadius: "12px", 
                fontSize: "13px", 
                fontWeight: 700, 
                cursor: bulkSyncing ? "not-allowed" : "pointer", 
                opacity: bulkSyncing ? 0.75 : 1,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 16px rgba(255, 117, 24, 0.25)",
                transition: "all 0.2s"
              }}
              className="hover:shadow-[0_6px_22px_rgba(255,117,24,0.35)] active:scale-[0.98]"
            >
              <RefreshCwIcon className={`w-4 h-4 ${bulkSyncing ? "animate-spin" : ""}`} />
              <span>{bulkSyncing ? "Syncing All Users..." : "Sync All Contributors"}</span>
            </button>

            <button
              onClick={handleAdminLogout}
              style={{ 
                background: "rgba(239,68,68,0.06)", 
                border: "1px solid rgba(239,68,68,0.22)", 
                color: "#f87171", 
                padding: "10px 18px", 
                borderRadius: "12px", 
                fontSize: "13px", 
                fontWeight: 600, 
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
              className="hover:bg-[rgba(239,68,68,0.14)] hover:border-[rgba(239,68,68,0.35)] active:scale-[0.98]"
              title="Lock Admin Portal & sign out"
            >
              <LockIcon className="w-4 h-4" />
              <span>Lock Portal</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "16px", marginBottom: "36px" }}>
          {/* Total Users */}
          <div 
            style={{ 
              background: "linear-gradient(180deg, #131317 0%, #0d0d10 100%)", 
              border: "1px solid rgba(255,255,255,0.07)", 
              borderRadius: "18px", 
              padding: "22px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              transition: "transform 0.2s, border-color 0.2s"
            }}
            className="hover:border-[rgba(255,255,255,0.15)]"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em" }}>TOTAL USERS</span>
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                <UsersIcon className="w-4 h-4" />
              </div>
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em" }}>{metrics.totalUsers ?? 0}</div>
          </div>

          {/* Contributors */}
          <div 
            style={{ 
              background: "linear-gradient(180deg, #131317 0%, #0d0d10 100%)", 
              border: "1px solid rgba(255,117,24,0.22)", 
              borderRadius: "18px", 
              padding: "22px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35), 0 0 20px rgba(255,117,24,0.04)",
              transition: "transform 0.2s, border-color 0.2s"
            }}
            className="hover:border-[rgba(255,117,24,0.4)]"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ color: "#FF8822", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em" }}>CONTRIBUTORS</span>
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(255,117,24,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF8822" }}>
                <GitPullRequestIcon className="w-4 h-4" />
              </div>
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, color: "#FF8822", letterSpacing: "-0.02em" }}>{metrics.contributors ?? 0}</div>
          </div>

          {/* Merged PRs */}
          <div 
            style={{ 
              background: "linear-gradient(180deg, #131317 0%, #0d0d10 100%)", 
              border: "1px solid rgba(255,255,255,0.07)", 
              borderRadius: "18px", 
              padding: "22px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              transition: "transform 0.2s, border-color 0.2s"
            }}
            className="hover:border-[rgba(56,189,248,0.3)]"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ color: "#38bdf8", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em" }}>MERGED PRS</span>
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(56,189,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>
                <CheckCircleIcon className="w-4 h-4" />
              </div>
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em" }}>{metrics.totalPRs ?? 0}</div>
          </div>

          {/* Total Points */}
          <div 
            style={{ 
              background: "linear-gradient(180deg, #131317 0%, #0d0d10 100%)", 
              border: "1px solid rgba(255,255,255,0.07)", 
              borderRadius: "18px", 
              padding: "22px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              transition: "transform 0.2s, border-color 0.2s"
            }}
            className="hover:border-[rgba(251,191,36,0.3)]"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ color: "#fbbf24", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em" }}>TOTAL POINTS</span>
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(251,191,36,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24" }}>
                <ZapIcon className="w-4 h-4" />
              </div>
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em" }}>{metrics.totalScore ?? 0}</div>
          </div>

          {/* Admins & Project Admins */}
          <div 
            style={{ 
              background: "linear-gradient(180deg, #131317 0%, #0d0d10 100%)", 
              border: "1px solid rgba(255,255,255,0.07)", 
              borderRadius: "18px", 
              padding: "22px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              transition: "transform 0.2s, border-color 0.2s"
            }}
            className="hover:border-[rgba(167,139,250,0.3)]"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ color: "#a78bfa", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em" }}>ADMINS & MODS</span>
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(167,139,250,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a78bfa" }}>
                <ShieldCheckIcon className="w-4 h-4" />
              </div>
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em" }}>{(metrics.admins ?? 0) + (metrics.projectAdmins ?? 0)}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ width: "100%", display: "flex", gap: "16px", marginBottom: "28px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Search Input with Icon */}
          <div style={{ position: "relative", flex: 1, minWidth: "280px" }}>
            <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }}>
              <SearchIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or github handle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ 
                width: "100%", 
                background: "#111115", 
                border: "1px solid rgba(255,255,255,0.08)", 
                borderRadius: "12px", 
                padding: "12px 18px 12px 40px", 
                color: "white", 
                fontSize: "14px", 
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#FF7518";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 117, 24, 0.12)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {search && (
              <button 
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "14px" }}
                className="hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Role Filter Tabs */}
          <div style={{ display: "flex", gap: "6px", background: "rgba(255,255,255,0.02)", padding: "4px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.06)" }}>
            {["all", "contributor", "mentor", "project-admin", "admin"].map((r) => {
              const isActive = roleFilter === r;
              return (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  style={{
                    background: isActive ? "linear-gradient(135deg, #FF7518 0%, #FF5500 100%)" : "transparent",
                    color: isActive ? "white" : "#9ca3af",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: "10px",
                    fontSize: "12px",
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.2s",
                    boxShadow: isActive ? "0 2px 10px rgba(255,117,24,0.3)" : "none"
                  }}
                  className={!isActive ? "hover:text-white hover:bg-[rgba(255,255,255,0.03)]" : ""}
                >
                  {r === "project-admin" ? "Project Admin" : r}
                </button>
              );
            })}
          </div>
        </div>

        {/* User Table */}
        <div 
          style={{ 
            width: "100%", 
            background: "linear-gradient(180deg, #121216 0%, #0c0c0f 100%)", 
            border: "1px solid rgba(255,255,255,0.08)", 
            borderRadius: "20px", 
            overflow: "hidden",
            boxShadow: "0 20px 50px -10px rgba(0,0,0,0.65)" 
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af", fontWeight: 700, fontSize: "11px", letterSpacing: "0.06em" }}>
                  <th style={{ padding: "18px 22px" }}>USER</th>
                  <th style={{ padding: "18px 22px" }}>GITHUB</th>
                  <th style={{ padding: "18px 22px" }}>ROLE</th>
                  <th style={{ padding: "18px 22px" }}>SCORE</th>
                  <th style={{ padding: "18px 22px" }}>PRS / REPOS</th>
                  <th style={{ padding: "18px 22px" }}>BADGES</th>
                  <th style={{ padding: "18px 22px", textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "54px 20px", textAlign: "center", color: "#9ca3af" }}>
                      No users matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map((user) => (
                    <tr 
                      key={user.id} 
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }} 
                      className="hover:bg-[rgba(255,117,24,0.02)] transition-colors"
                    >
                      {/* User */}
                      <td style={{ padding: "16px 22px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "#1c1c22", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, color: "#FF8822" }}>
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <span>{user.full_name?.[0]?.toUpperCase() || "U"}</span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "white" }}>{user.full_name || "Anonymous"}</div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>{user.email || "No email"}</div>
                          </div>
                        </div>
                      </td>

                      {/* GitHub */}
                      <td style={{ padding: "16px 22px" }}>
                        {user.github ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <a 
                              href={`https://github.com/${user.github}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ color: "#FF8822", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }} 
                              className="hover:underline"
                            >
                              @{user.github}
                              <ExternalLinkIcon className="w-3 h-3 opacity-60" />
                            </a>
                            <button
                              onClick={() => handleSetGithub(user.id, user.github)}
                              title="Change GitHub username"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af", cursor: "pointer", fontSize: "11px", padding: "3px 6px", borderRadius: "6px" }}
                              className="hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSetGithub(user.id)}
                            style={{ background: "rgba(255,117,24,0.08)", border: "1px solid rgba(255,117,24,0.25)", color: "#FF8822", padding: "5px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                            className="hover:bg-[rgba(255,117,24,0.18)] transition-colors"
                          >
                            + Link GitHub
                          </button>
                        )}
                      </td>

                      {/* Role */}
                      <td style={{ padding: "16px 22px" }}>
                        <select
                          value={user.role || "contributor"}
                          onChange={(e) =>
                            handleRoleChange(
                              user.id,
                              e.target.value as "contributor" | "mentor" | "project-admin" | "admin"
                            )
                          }
                          style={{ 
                            background: "#16161c", 
                            border: "1px solid rgba(255,255,255,0.1)", 
                            color: "white", 
                            padding: "6px 12px", 
                            borderRadius: "10px", 
                            fontSize: "12px", 
                            fontWeight: 500,
                            cursor: "pointer", 
                            outline: "none" 
                          }}
                        >
                          <option value="contributor">Contributor</option>
                          <option value="mentor">Mentor</option>
                          <option value="project-admin">Project Admin</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>

                      {/* Score */}
                      <td style={{ padding: "16px 22px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontWeight: 700, fontSize: "15px", color: (user.role || "contributor") === "contributor" ? "#fbbf24" : "#6b7280", minWidth: "30px" }}>
                            {user.score ?? 0}
                          </span>
                          {(user.role || "contributor") === "contributor" && (
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button
                                title="+10 Points"
                                onClick={() => handleScoreAdjust(user.id, 10, "add")}
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#FF8822", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                                className="hover:bg-[rgba(255,117,24,0.15)] transition-colors"
                              >
                                +10
                              </button>
                              <button
                                title="+50 Points"
                                onClick={() => handleScoreAdjust(user.id, 50, "add")}
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#FF8822", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                                className="hover:bg-[rgba(255,117,24,0.15)] transition-colors"
                              >
                                +50
                              </button>
                              <button
                                title="+100 Points"
                                onClick={() => handleScoreAdjust(user.id, 100, "add")}
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#FF8822", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                                className="hover:bg-[rgba(255,117,24,0.15)] transition-colors"
                              >
                                +100
                              </button>
                              <button
                                title="Reset to 0"
                                onClick={() => handleScoreAdjust(user.id, 0, "set")}
                                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                                className="hover:bg-[rgba(239,68,68,0.18)] transition-colors"
                              >
                                0
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* PRs / Projects */}
                      <td style={{ padding: "16px 22px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.03)", padding: "4px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", fontSize: "12px", color: "#d1d5db" }}>
                          <span style={{ fontWeight: 600, color: "white" }}>{user.merged_prs ?? 0}</span> PRs
                          <span style={{ opacity: 0.3 }}>•</span>
                          <span style={{ fontWeight: 600, color: "white" }}>{user.projects_count ?? 0}</span> Repos
                        </div>
                      </td>

                      {/* Badges Created */}
                      <td style={{ padding: "16px 22px" }}>
                        <span 
                          style={{ 
                            display: "inline-block", 
                            padding: "3px 8px", 
                            borderRadius: "6px", 
                            fontSize: "11px", 
                            fontWeight: 700, 
                            background: (user.badges_created ?? 0) >= 3 ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)", 
                            color: (user.badges_created ?? 0) >= 3 ? "#f87171" : "#9ca3af",
                            border: (user.badges_created ?? 0) >= 3 ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(255,255,255,0.06)"
                          }}
                        >
                          {(user.badges_created ?? 0)} / 3
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "16px 22px", textAlign: "right" }}>
                        {user.github ? (
                          <button
                            onClick={() => handleSingleSync(user)}
                            disabled={syncingId === user.id}
                            style={{ 
                              background: "rgba(255,117,24,0.08)", 
                              border: "1px solid rgba(255,117,24,0.25)", 
                              color: "#FF8822", 
                              padding: "7px 14px", 
                              borderRadius: "10px", 
                              fontSize: "12px", 
                              fontWeight: 600, 
                              cursor: syncingId === user.id ? "not-allowed" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "all 0.2s"
                            }}
                            className="hover:bg-[rgba(255,117,24,0.18)] active:scale-[0.97]"
                          >
                            <RefreshCwIcon className={`w-3.5 h-3.5 ${syncingId === user.id ? "animate-spin" : ""}`} />
                            <span>{syncingId === user.id ? "Syncing..." : "Sync PRs"}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetGithub(user.id)}
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af", padding: "7px 14px", borderRadius: "10px", fontSize: "12px", cursor: "pointer", transition: "all 0.2s" }}
                            className="hover:text-white hover:border-[rgba(255,255,255,0.2)]"
                          >
                            + Set GitHub
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Side Toast Notification */}
      {toast && (
        <div 
          role="status"
          aria-live="polite"
          onMouseEnter={() => setToastPaused(true)}
          onMouseLeave={() => setToastPaused(false)}
          className="fixed bottom-6 right-6 z-[9999] flex flex-col overflow-hidden"
          style={{ 
            maxWidth: "calc(100vw - 32px)", 
            width: "360px",
            background: "linear-gradient(180deg, #16161b 0%, #0d0d11 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: toast.type === "error" ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "14px",
            boxShadow: toast.type === "error" 
              ? "0 20px 45px -10px rgba(0, 0, 0, 0.85), 0 0 24px rgba(239, 68, 68, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)"
              : "0 20px 45px -10px rgba(0, 0, 0, 0.85), 0 0 24px rgba(255, 117, 24, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
            animation: "toastSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: "11px" }}>
            {/* Minimalist circular status icon */}
            <div 
              style={{ 
                width: "24px", 
                height: "24px", 
                borderRadius: "50%", 
                background: toast.type === "error" ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 117, 24, 0.15)", 
                color: toast.type === "error" ? "#f87171" : "#FF7518",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {toast.type === "error" ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : toast.type === "info" ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>

            {/* Message text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "13px", color: "#f3f4f6", fontWeight: 500, margin: 0, lineHeight: "1.45", wordBreak: "break-word" }}>
                {toast.message}
              </p>
            </div>

            {/* Subtle close button */}
            <button 
              onClick={() => setToast(null)} 
              style={{ 
                background: "transparent", 
                border: "none", 
                color: "#6b7280", 
                cursor: "pointer", 
                width: "22px", 
                height: "22px", 
                borderRadius: "6px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0,
                padding: 0,
                transition: "color 0.15s, background-color 0.15s"
              }}
              className="hover:text-white hover:bg-[rgba(255,255,255,0.08)] active:scale-95"
              title="Dismiss"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Ultra-sleek progress line */}
          <div style={{ width: "100%", height: "1.5px", background: "rgba(255, 255, 255, 0.04)", overflow: "hidden" }}>
            <div 
              style={{ 
                height: "100%", 
                background: toast.type === "error" 
                  ? "linear-gradient(90deg, #ef4444, #dc2626)" 
                  : "linear-gradient(90deg, #FF7518, #FF5500)", 
                animation: "toastProgress 4s linear forwards",
                animationPlayState: toastPaused ? "paused" : "running"
              }} 
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes toastSlideUp {
          from {
            transform: translateY(16px) scale(0.97);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes toastProgress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>

      <Footer />
    </div>
  );
}

