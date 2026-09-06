"use client";

import React, { useState, useTransition } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Profile } from "@/lib/supabase/database";
import { updateUserRole, updateUserScore, syncSingleUser, syncAllUsers } from "@/lib/actions/admin";

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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
  const handleRoleChange = (userId: string, newRole: any) => {
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
        setStatusMessage(`Role updated to ${newRole} for user.`);
      } else {
        alert(res.error || "Failed to update role");
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
        setStatusMessage("Score updated successfully.");
      } else {
        alert(res.error || "Failed to update score");
      }
    });
  };

  // Handle Single Sync
  const handleSingleSync = async (user: Profile) => {
    if (!user.github) {
      alert("This user does not have a linked GitHub username.");
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
        setStatusMessage(`Synced @${user.github}: ${res.score} pts (${res.merged_prs} PRs)`);
      } else {
        alert(res.error || "Failed to sync GitHub contributions.");
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
    setStatusMessage("Bulk sync started in background...");
    try {
      const res = await syncAllUsers();
      if (res.success) {
        setStatusMessage(`Bulk sync complete! Synced: ${res.synced}, Failed: ${res.failed}, Total: ${res.total}`);
        window.location.reload();
      } else {
        alert(res.error || "Bulk sync failed");
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

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-white">
      <Navbar />
      <div style={{ height: "96px", width: "100%", flexShrink: 0 }} aria-hidden="true" />

      <main className="flex-grow flex flex-col items-center" style={{ margin: "0 auto", maxWidth: "1440px", width: "100%", padding: "24px 32px 96px" }}>
        {/* Header */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "4px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: 700, marginBottom: "12px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />
              SUPER ADMIN PORTAL
            </div>
            <h1 style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.02em" }}>Command Center</h1>
            <p style={{ color: "#9ca3af", fontSize: "15px" }}>Manage contributors, verify roles, trigger syncs, and adjust scoring.</p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={handleExportCSV}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "10px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              className="hover:bg-[rgba(255,255,255,0.1)] transition-colors"
            >
              📥 Export CSV
            </button>
            <button
              onClick={handleBulkSync}
              disabled={bulkSyncing}
              style={{ background: "var(--orange)", border: "none", color: "white", padding: "10px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: bulkSyncing ? "not-allowed" : "pointer", opacity: bulkSyncing ? 0.7 : 1 }}
              className="hover:bg-[var(--orange-dark)] transition-colors shadow-lg shadow-[rgba(255,117,24,0.2)]"
            >
              {bulkSyncing ? "Syncing All Users..." : "⚡ Sync All Users"}
            </button>
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div style={{ width: "100%", background: "rgba(255,117,24,0.1)", border: "1px solid rgba(255,117,24,0.3)", color: "var(--orange)", padding: "12px 16px", borderRadius: "12px", fontSize: "14px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {/* Metric Cards */}
        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "20px" }}>
            <div style={{ color: "#9ca3af", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>TOTAL USERS</div>
            <div style={{ fontSize: "28px", fontWeight: 800 }}>{metrics.totalUsers}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "20px" }}>
            <div style={{ color: "var(--orange)", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>CONTRIBUTORS</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--orange)" }}>{metrics.contributors}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "20px" }}>
            <div style={{ color: "#38bdf8", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>MERGED PRS</div>
            <div style={{ fontSize: "28px", fontWeight: 800 }}>{metrics.totalPRs}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "20px" }}>
            <div style={{ color: "#f59e0b", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>TOTAL POINTS</div>
            <div style={{ fontSize: "28px", fontWeight: 800 }}>{metrics.totalScore}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "20px" }}>
            <div style={{ color: "#ef4444", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>ADMINS & PROJECT ADMINS</div>
            <div style={{ fontSize: "28px", fontWeight: 800 }}>{metrics.admins + metrics.projectAdmins}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ width: "100%", display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search by name, email, or github handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: "260px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 18px", color: "white", fontSize: "14px", outline: "none" }}
          />

          <div style={{ display: "flex", gap: "8px", background: "rgba(255,255,255,0.03)", padding: "4px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
            {["all", "contributor", "mentor", "project-admin", "admin"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                style={{
                  background: roleFilter === r ? "var(--orange)" : "transparent",
                  color: roleFilter === r ? "white" : "#9ca3af",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.2s",
                }}
              >
                {r === "project-admin" ? "Project Admin" : r}
              </button>
            ))}
          </div>
        </div>

        {/* User Table */}
        <div style={{ width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af", fontWeight: 600, fontSize: "11px", letterSpacing: "0.05em" }}>
                <th style={{ padding: "16px 20px" }}>USER</th>
                <th style={{ padding: "16px 20px" }}>GITHUB</th>
                <th style={{ padding: "16px 20px" }}>ROLE</th>
                <th style={{ padding: "16px 20px" }}>SCORE</th>
                <th style={{ padding: "16px 20px" }}>PRS / PROJECTS</th>
                <th style={{ padding: "16px 20px" }}>BADGES</th>
                <th style={{ padding: "16px 20px", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "48px 20px", textAlign: "center", color: "#9ca3af" }}>
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((user) => (
                  <tr key={user.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    {/* User */}
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#1c1c1f", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span>{user.full_name?.[0] || "U"}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "white" }}>{user.full_name || "Anonymous"}</div>
                          <div style={{ fontSize: "11px", color: "#6b7280" }}>{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* GitHub */}
                    <td style={{ padding: "16px 20px" }}>
                      {user.github ? (
                        <a href={`https://github.com/${user.github}`} target="_blank" rel="noreferrer" style={{ color: "var(--orange)", textDecoration: "none", fontWeight: 500 }} className="hover:underline">
                          @{user.github}
                        </a>
                      ) : (
                        <span style={{ color: "#6b7280" }}>Not linked</span>
                      )}
                    </td>

                    {/* Role */}
                    <td style={{ padding: "16px 20px" }}>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        style={{ background: "#161618", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", outline: "none" }}
                      >
                        <option value="contributor">Contributor</option>
                        <option value="mentor">Mentor</option>
                        <option value="project-admin">Project Admin</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    {/* Score */}
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 700, fontSize: "15px", color: user.role === "contributor" ? "white" : "#6b7280" }}>
                          {user.score}
                        </span>
                        {user.role === "contributor" && (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              title="+10 Points"
                              onClick={() => handleScoreAdjust(user.id, 10, "add")}
                              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--orange)", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                            >
                              +10
                            </button>
                            <button
                              title="+50 Points"
                              onClick={() => handleScoreAdjust(user.id, 50, "add")}
                              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--orange)", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                            >
                              +50
                            </button>
                            <button
                              title="+100 Points"
                              onClick={() => handleScoreAdjust(user.id, 100, "add")}
                              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--orange)", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                            >
                              +100
                            </button>
                            <button
                              title="Reset to 0"
                              onClick={() => handleScoreAdjust(user.id, 0, "set")}
                              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                            >
                              0
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* PRs / Projects */}
                    <td style={{ padding: "16px 20px", color: "#d1d5db" }}>
                      {user.merged_prs} PRs • {user.projects_count} Repos
                    </td>

                    {/* Badges Created */}
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ color: user.badges_created >= 3 ? "#ef4444" : "#9ca3af", fontWeight: 600 }}>
                        {user.badges_created}/3
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      {user.github ? (
                        <button
                          onClick={() => handleSingleSync(user)}
                          disabled={syncingId === user.id}
                          style={{ background: "rgba(255,117,24,0.1)", border: "1px solid rgba(255,117,24,0.3)", color: "var(--orange)", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: syncingId === user.id ? "not-allowed" : "pointer" }}
                          className="hover:bg-[rgba(255,117,24,0.2)] transition-colors"
                        >
                          {syncingId === user.id ? "Syncing..." : "🔄 Sync PRs"}
                        </button>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#6b7280" }}>No GitHub</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      <Footer />
    </div>
  );
}
