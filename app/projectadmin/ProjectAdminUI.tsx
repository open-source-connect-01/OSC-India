"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ProjectAdminData,
  AdminContribution,
  updateContributionPoints,
} from "@/lib/actions/project-admin";

interface ProjectAdminUIProps {
  adminProfile: {
    name: string;
    github: string;
    avatar: string | null;
    role: string;
  };
  data: ProjectAdminData | null;
}

export default function ProjectAdminUI({
  adminProfile,
  data: initialData,
}: ProjectAdminUIProps) {
  const [data, setData] = useState<ProjectAdminData | null>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");

  // State for interactive Give / Override Points Modal
  const [editingContrib, setEditingContrib] = useState<AdminContribution | null>(null);
  const [pointInput, setPointInput] = useState<number>(10);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleOpenEdit = (c: AdminContribution) => {
    setEditingContrib(c);
    setPointInput(c.pointsAwarded);
  };

  const handleSavePoints = async () => {
    if (!editingContrib || !data) return;
    const pts = Number(pointInput);
    if (isNaN(pts) || pts < 0) {
      setToast({ message: "Points must be a valid number (0 or greater).", type: "error" });
      return;
    }

    setIsUpdating(true);
    try {
      const res = await updateContributionPoints(
        editingContrib.id,
        pts,
        adminProfile.github
      );

      if (!res.success) {
        setToast({ message: res.error || "Failed to update points.", type: "error" });
        setIsUpdating(false);
        return;
      }

      const newDiff =
        res.newDifficulty ||
        (pts >= 50 ? "Expert" : pts >= 30 ? "Hard" : pts >= 20 ? "Medium" : "Easy");

      // Update contributions list in local state
      const updatedContributions = data.contributions.map((c) => {
        if (c.id === editingContrib.id) {
          return {
            ...c,
            pointsAwarded: pts,
            difficulty: newDiff,
          };
        }
        return c;
      });

      // Recalculate difficulty breakdown
      const newBreakdown = {
        easy: { count: 0, points: 0 },
        medium: { count: 0, points: 0 },
        hard: { count: 0, points: 0 },
        expert: { count: 0, points: 0 },
      };

      const contribMap = new Map<
        string,
        { name: string; github: string; avatar: string; prCount: number; points: number }
      >();

      for (const c of updatedContributions) {
        if (c.difficulty === "Expert") {
          newBreakdown.expert.count++;
          newBreakdown.expert.points += c.pointsAwarded;
        } else if (c.difficulty === "Hard") {
          newBreakdown.hard.count++;
          newBreakdown.hard.points += c.pointsAwarded;
        } else if (c.difficulty === "Medium") {
          newBreakdown.medium.count++;
          newBreakdown.medium.points += c.pointsAwarded;
        } else {
          newBreakdown.easy.count++;
          newBreakdown.easy.points += c.pointsAwarded;
        }

        const k = c.contributorGithub || c.contributorName;
        const cur = contribMap.get(k) || {
          name: c.contributorName,
          github: c.contributorGithub,
          avatar: c.contributorAvatar,
          prCount: 0,
          points: 0,
        };
        cur.prCount++;
        cur.points += c.pointsAwarded;
        contribMap.set(k, cur);
      }

      const newSummary = Array.from(contribMap.values())
        .map((c) => ({
          contributorName: c.name,
          contributorGithub: c.github,
          contributorAvatar: c.avatar,
          prCount: c.prCount,
          totalPoints: c.points,
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints);
      const newTotal = updatedContributions.reduce((sum, c) => sum + c.pointsAwarded, 0);

      setData({
        ...data,
        totalPointsAwarded: newTotal,
        contributions: updatedContributions,
        difficultyBreakdown: newBreakdown,
        contributorSummary: newSummary,
      });

      setToast({
        message: `Points updated to ${pts} pts for ${editingContrib.contributorName}!`,
        type: "success",
      });
      setEditingContrib(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating points";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  const contributions = data?.contributions || [];

  // Filtered contributions list
  const filteredContributions = useMemo(() => {
    return contributions.filter((c: AdminContribution) => {
      // Difficulty match
      if (difficultyFilter !== "all" && c.difficulty.toLowerCase() !== difficultyFilter.toLowerCase()) {
        return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.contributorName.toLowerCase().includes(q);
        const matchGithub = c.contributorGithub.toLowerCase().includes(q);
        const matchPr = c.prUrl.toLowerCase().includes(q);
        return matchName || matchGithub || matchPr;
      }

      return true;
    });
  }, [contributions, difficultyFilter, searchQuery]);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "28px" }}>


      {/* 1. Header & Maintainer Badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
          paddingBottom: "24px",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 12px",
              borderRadius: "9999px",
              background: "rgba(255, 117, 24, 0.1)",
              border: "1px solid rgba(255, 117, 24, 0.25)",
              color: "#ff7518",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontSize: "14px" }}>🛡️</span>
            <span>PROJECT ADMIN DASHBOARD</span>
          </div>
          <h1
            style={{
              fontSize: "clamp(26px, 4vw, 36px)",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              margin: "0 0 8px 0",
              lineHeight: 1.2,
            }}
          >
            Welcome, {adminProfile.name}
          </h1>
          <p style={{ fontSize: "14px", color: "#9ca3af", margin: 0, maxWidth: "680px", lineHeight: 1.5 }}>
            Manage incoming contributions, track PRs merged on your project, and monitor points awarded to competition contributors.
          </p>
        </div>

        {/* Admin Non-Competitive Score Pill */}
        <div
          style={{
            background: "rgba(18, 18, 24, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              adminProfile.avatar ||
              (adminProfile.github
                ? `https://avatars.githubusercontent.com/${adminProfile.github}`
                : "/default-avatar.png")
            }
            alt={adminProfile.name}
            width={44}
            height={44}
            style={{ borderRadius: "50%", border: "2px solid #ff7518", flexShrink: 0 }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 700, fontSize: "14px", color: "#ffffff" }}>
                @{adminProfile.github || "admin"}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  background: "#2a1508",
                  color: "#ff8c33",
                  border: "1px solid rgba(255,117,24,0.3)",
                  borderRadius: "6px",
                  padding: "2px 6px",
                }}
              >
                MAINTAINER
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
              Score: <strong style={{ color: "#38bdf8" }}>0 pts</strong> (Organizer / No Score)
            </div>
          </div>
        </div>
      </div>

      {/* If no project is assigned */}
      {!data ? (
        <div
          style={{
            background: "#0d0e12",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📂</div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "8px" }}>
            No Matching Repository Found
          </h3>
          <p style={{ fontSize: "14px", color: "#9ca3af", maxWidth: "500px", margin: "0 auto 20px" }}>
            We could not automatically match a repository to GitHub username <strong>@{adminProfile.github}</strong>.
            Make sure your GitHub account is linked to the repository owner handle for your competition project.
          </p>
          <Link
            href="/projects"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "10px",
              background: "#ff7518",
              color: "#000000",
              fontWeight: 700,
              fontSize: "13px",
              textDecoration: "none",
            }}
          >
            View Projects Directory →
          </Link>
        </div>
      ) : (
        <>
          {/* 2. Managed Project Card */}
          <div
            style={{
              background: "linear-gradient(180deg, #121318 0%, #0a0b0e 100%)",
              border: "1px solid rgba(255, 117, 24, 0.2)",
              borderRadius: "20px",
              padding: "24px 28px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <span style={{ fontSize: "20px" }}>📦</span>
                <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff", margin: 0 }}>
                  {data.project.name}
                </h2>
              </div>
              {data.project.description && (
                <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 10px 0", maxWidth: "780px" }}>
                  {data.project.description.replace(/<!--[\s\S]*?-->/g, "").trim()}
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <a
                  href={data.project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "12px",
                    color: "#ff7518",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontWeight: 600,
                  }}
                  className="hover:underline"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  {data.project.url.replace(/^https?:\/\/github\.com\//i, "")} ↗
                </a>
              </div>
            </div>

            <a
              href={`${data.project.url}/pulls?q=is%3Apr+is%3Aclosed+label%3A%22OSCI%2726%22`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                background: "rgba(255, 117, 24, 0.12)",
                border: "1px solid rgba(255, 117, 24, 0.3)",
                borderRadius: "10px",
                color: "#ff7518",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              className="hover:bg-[rgba(255,117,24,0.2)]"
            >
              <span>View Closed PRs on GitHub</span>
              <span>↗</span>
            </a>
          </div>

          {/* 3. Key Metrics Cards (4 columns) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "18px",
            }}
          >
            {/* Card 1: Total PRs Merged */}
            <div
              style={{
                background: "linear-gradient(180deg, #111216 0%, #090a0d 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "18px",
                padding: "20px 24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#38bdf8", letterSpacing: "0.05em" }}>
                  TOTAL PRS MERGED
                </span>
                <span style={{ fontSize: "18px" }}>🔀</span>
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
                {data.totalPRsMerged}
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                Official OSCI&apos;26 Merged PRs
              </div>
            </div>

            {/* Card 2: Merged by Him / Her */}
            <div
              style={{
                background: "linear-gradient(180deg, #111216 0%, #090a0d 100%)",
                border: "1px solid rgba(255, 117, 24, 0.25)",
                borderRadius: "18px",
                padding: "20px 24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#ff7518", letterSpacing: "0.05em" }}>
                  MERGED BY YOU
                </span>
                <span style={{ fontSize: "18px" }}>✅</span>
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: "#ff7518", letterSpacing: "-0.02em" }}>
                {data.prsMergedByAdmin}
              </div>
              <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                Pull requests reviewed & merged
              </div>
            </div>

            {/* Card 3: Active Contributors */}
            <div
              style={{
                background: "linear-gradient(180deg, #111216 0%, #090a0d 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "18px",
                padding: "20px 24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#4ade80", letterSpacing: "0.05em" }}>
                  ACTIVE CONTRIBUTORS
                </span>
                <span style={{ fontSize: "18px" }}>👥</span>
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
                {data.totalContributors}
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                Contributors with merged code
              </div>
            </div>

            {/* Card 4: Total Points Awarded */}
            <div
              style={{
                background: "linear-gradient(180deg, #111216 0%, #090a0d 100%)",
                border: "1px solid rgba(251, 191, 36, 0.25)",
                borderRadius: "18px",
                padding: "20px 24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#fbbf24", letterSpacing: "0.05em" }}>
                  POINTS DISTRIBUTED
                </span>
                <span style={{ fontSize: "18px" }}>⚡</span>
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: "#fbbf24", letterSpacing: "-0.02em" }}>
                {data.totalPointsAwarded}
              </div>
              <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                Awarded to project contributors
              </div>
            </div>
          </div>

          {/* 4. Points Given Section to Contributors */}
          <div
            style={{
              background: "#0c0d11",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "24px 28px",
            }}
          >
            <div style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#ffffff", margin: "0 0 4px 0" }}>
                ⚡ Points Given Section
              </h3>
              <p style={{ fontSize: "13px", color: "#8b929e", margin: 0 }}>
                Breakdown of competition points awarded to contributors based on PR difficulty levels.
              </p>
            </div>

            {/* Difficulty breakdown cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
                marginBottom: "24px",
              }}
            >
              {/* Easy */}
              <div
                style={{
                  background: "rgba(74, 222, 128, 0.04)",
                  border: "1px solid rgba(74, 222, 128, 0.2)",
                  borderRadius: "14px",
                  padding: "14px 18px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#4ade80" }}>EASY (10 PTS)</span>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>{data.difficultyBreakdown.easy.count} PRs</span>
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#4ade80", marginTop: "6px" }}>
                  {data.difficultyBreakdown.easy.points} pts
                </div>
              </div>

              {/* Medium */}
              <div
                style={{
                  background: "rgba(96, 165, 250, 0.04)",
                  border: "1px solid rgba(96, 165, 250, 0.2)",
                  borderRadius: "14px",
                  padding: "14px 18px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#60a5fa" }}>MEDIUM (20 PTS)</span>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>{data.difficultyBreakdown.medium.count} PRs</span>
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#60a5fa", marginTop: "6px" }}>
                  {data.difficultyBreakdown.medium.points} pts
                </div>
              </div>

              {/* Hard */}
              <div
                style={{
                  background: "rgba(192, 132, 252, 0.04)",
                  border: "1px solid rgba(192, 132, 252, 0.2)",
                  borderRadius: "14px",
                  padding: "14px 18px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#c084fc" }}>HARD (30 PTS)</span>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>{data.difficultyBreakdown.hard.count} PRs</span>
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#c084fc", marginTop: "6px" }}>
                  {data.difficultyBreakdown.hard.points} pts
                </div>
              </div>

              {/* Expert */}
              <div
                style={{
                  background: "rgba(251, 146, 60, 0.04)",
                  border: "1px solid rgba(251, 146, 60, 0.2)",
                  borderRadius: "14px",
                  padding: "14px 18px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#fb923c" }}>EXPERT (50 PTS)</span>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>{data.difficultyBreakdown.expert.count} PRs</span>
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#fb923c", marginTop: "6px" }}>
                  {data.difficultyBreakdown.expert.points} pts
                </div>
              </div>
            </div>

            {/* Top Contributors to this Project */}
            {data.contributorSummary.length > 0 && (
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#d1d5db", margin: "0 0 12px 0" }}>
                  Top Contributors on This Project
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {data.contributorSummary.slice(0, 6).map((c, i) => (
                    <div
                      key={c.contributorGithub || i}
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: "12px",
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.contributorAvatar || "/default-avatar.png"}
                          alt={c.contributorName}
                          width={32}
                          height={32}
                          style={{ borderRadius: "50%", flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#f3f4f6",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {c.contributorName}
                          </div>
                          {c.contributorGithub && (
                            <a
                              href={`https://github.com/${c.contributorGithub}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: "11px", color: "#6b7280", textDecoration: "none" }}
                              className="hover:underline hover:text-white"
                            >
                              @{c.contributorGithub}
                            </a>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, paddingLeft: "8px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#fbbf24" }}>
                          +{c.totalPoints} pts
                        </div>
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>
                          {c.prCount} {c.prCount === 1 ? "PR" : "PRs"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. Other's Contributions on Their Project Table */}
          <div
            style={{
              background: "#0c0d11",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "24px 28px",
            }}
          >
            {/* Table Header Controls */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
                marginBottom: "20px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#ffffff", margin: "0 0 4px 0" }}>
                  📂 Other&apos;s Contributions on Your Project
                </h3>
                <p style={{ fontSize: "13px", color: "#8b929e", margin: 0 }}>
                  Showing all {filteredContributions.length} of {contributions.length} verified pull requests
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                {/* Search */}
                <input
                  type="text"
                  placeholder="Search contributor or PR..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    padding: "8px 14px",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                    minWidth: "220px",
                  }}
                />

                {/* Difficulty Filter */}
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="all" style={{ background: "#121318", color: "#ffffff" }}>All Difficulties</option>
                  <option value="easy" style={{ background: "#121318", color: "#ffffff" }}>Easy (10 pts)</option>
                  <option value="medium" style={{ background: "#121318", color: "#ffffff" }}>Medium (20 pts)</option>
                  <option value="hard" style={{ background: "#121318", color: "#ffffff" }}>Hard (30 pts)</option>
                  <option value="expert" style={{ background: "#121318", color: "#ffffff" }}>Expert (50 pts)</option>
                </select>
              </div>
            </div>

            {/* Table */}
            {filteredContributions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "#6b7280" }}>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>🔍</div>
                <div style={{ fontSize: "14px" }}>
                  {contributions.length === 0
                    ? "No contributor pull requests have been merged on this project yet."
                    : "No contributions match your search filter."}
                </div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "#6b7280", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em" }}>
                        CONTRIBUTOR
                      </th>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "#6b7280", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em" }}>
                        PULL REQUEST
                      </th>
                      <th style={{ textAlign: "center", padding: "10px 14px", color: "#6b7280", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em" }}>
                        DIFFICULTY
                      </th>
                      <th style={{ textAlign: "center", padding: "10px 14px", color: "#6b7280", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em" }}>
                        POINTS GIVEN
                      </th>
                      <th style={{ textAlign: "center", padding: "10px 14px", color: "#6b7280", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em" }}>
                        ACTION
                      </th>
                      <th style={{ textAlign: "right", padding: "10px 14px", color: "#6b7280", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em" }}>
                        MERGED DATE
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContributions.map((c) => {
                      const prNumber = c.prUrl.match(/\/pull\/(\d+)/)?.[1] || "";
                      const diffColor =
                        c.difficulty === "Expert" ? "#fb923c" :
                        c.difficulty === "Hard" ? "#c084fc" :
                        c.difficulty === "Medium" ? "#60a5fa" : "#4ade80";
                      const diffBg =
                        c.difficulty === "Expert" ? "rgba(251,146,60,0.1)" :
                        c.difficulty === "Hard" ? "rgba(192,132,252,0.1)" :
                        c.difficulty === "Medium" ? "rgba(96,165,250,0.1)" : "rgba(74,222,128,0.1)";
                      const formattedDate = c.mergedAt
                        ? new Date(c.mergedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—";

                      return (
                        <tr
                          key={c.id}
                          style={{
                            borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                            transition: "background-color 0.15s ease",
                          }}
                          className="hover:bg-[rgba(255,255,255,0.03)]"
                        >
                          {/* Contributor info */}
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={c.contributorAvatar || "/default-avatar.png"}
                                alt={c.contributorName}
                                width={32}
                                height={32}
                                style={{ borderRadius: "50%", flexShrink: 0 }}
                              />
                              <div>
                                <div style={{ fontWeight: 600, color: "#f3f4f6", fontSize: "13px" }}>
                                  {c.contributorName}
                                </div>
                                {c.contributorGithub && (
                                  <a
                                    href={`https://github.com/${c.contributorGithub}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: "11px", color: "#6b7280", textDecoration: "none" }}
                                    className="hover:underline hover:text-white"
                                  >
                                    @{c.contributorGithub}
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* PR link */}
                          <td style={{ padding: "12px 14px" }}>
                            <a
                              href={c.prUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#38bdf8",
                                textDecoration: "none",
                                fontSize: "13px",
                                fontWeight: 500,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                              className="hover:underline"
                            >
                              <span>{prNumber ? `PR #${prNumber}` : "View Pull Request"}</span>
                              <span style={{ fontSize: "11px" }}>↗</span>
                            </a>
                          </td>

                          {/* Difficulty badge */}
                          <td style={{ padding: "12px 14px", textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: diffColor,
                                background: diffBg,
                                border: `1px solid ${diffColor}44`,
                                borderRadius: "6px",
                                padding: "3px 10px",
                              }}
                            >
                              {c.difficulty}
                            </span>
                          </td>

                          {/* Points Given */}
                          <td style={{ padding: "12px 14px", textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: "12px",
                                fontWeight: 800,
                                color: "#fbbf24",
                                background: "rgba(251, 191, 36, 0.08)",
                                border: "1px solid rgba(251, 191, 36, 0.25)",
                                borderRadius: "8px",
                                padding: "4px 10px",
                              }}
                            >
                              +{c.pointsAwarded} pts
                            </span>
                          </td>

                          {/* Action: Give / Override Points */}
                          <td style={{ padding: "12px 14px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(c)}
                              title="Give or Override Points for this PR"
                              style={{
                                background: "rgba(255, 117, 24, 0.12)",
                                border: "1px solid rgba(255, 117, 24, 0.35)",
                                borderRadius: "8px",
                                padding: "5px 12px",
                                color: "#ff8c33",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                transition: "all 0.15s ease",
                              }}
                              className="hover:bg-[rgba(255,117,24,0.25)] hover:text-white"
                            >
                              
                              <span>Give Points</span>
                            </button>
                          </td>

                          {/* Merged date */}
                          <td style={{ padding: "12px 14px", textAlign: "right", color: "#9ca3af", fontSize: "12px" }}>
                            {formattedDate}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Interactive Give / Override Points Modal */}
      {editingContrib && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => !isUpdating && setEditingContrib(null)}
        >
          <div
            style={{
              background: "#111217",
              border: "1px solid rgba(255, 117, 24, 0.35)",
              borderRadius: "20px",
              padding: "28px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 117, 24, 0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "rgba(255, 117, 24, 0.15)",
                    border: "1px solid rgba(255, 117, 24, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                  }}
                >
                  ⚡
                </div>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                    Give / Override Points
                  </h3>
                  <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                    Award competition points to contributor
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isUpdating && setEditingContrib(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#9ca3af",
                  cursor: "pointer",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Target PR & Contributor Info */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                borderRadius: "12px",
                padding: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editingContrib.contributorAvatar || "/default-avatar.png"}
                  alt={editingContrib.contributorName}
                  width={36}
                  height={36}
                  style={{ borderRadius: "50%" }}
                />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>
                    {editingContrib.contributorName}
                  </div>
                  {editingContrib.contributorGithub && (
                    <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                      @{editingContrib.contributorGithub}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <a
                  href={editingContrib.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "12px", color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}
                  className="hover:underline"
                >
                  {editingContrib.prUrl.match(/\/pull\/(\d+)/)?.[1]
                    ? `PR #${editingContrib.prUrl.match(/\/pull\/(\d+)/)?.[1]}`
                    : "View PR"} ↗
                </a>
                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                  Current: {editingContrib.pointsAwarded} pts
                </div>
              </div>
            </div>

            {/* Quick Difficulty Presets */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#d1d5db", display: "block", marginBottom: "8px" }}>
                Quick Preset (Difficulty Tier):
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                {[
                  { label: "Easy", pts: 10, color: "#4ade80", bg: "rgba(74, 222, 128, 0.1)" },
                  { label: "Medium", pts: 20, color: "#60a5fa", bg: "rgba(96, 165, 250, 0.1)" },
                  { label: "Hard", pts: 30, color: "#c084fc", bg: "rgba(192, 132, 252, 0.1)" },
                  { label: "Expert", pts: 50, color: "#fb923c", bg: "rgba(251, 146, 60, 0.1)" },
                ].map((tier) => {
                  const isSelected = pointInput === tier.pts;
                  return (
                    <button
                      key={tier.label}
                      type="button"
                      onClick={() => setPointInput(tier.pts)}
                      style={{
                        background: isSelected ? tier.bg : "rgba(255, 255, 255, 0.03)",
                        border: `1.5px solid ${isSelected ? tier.color : "rgba(255, 255, 255, 0.08)"}`,
                        borderRadius: "10px",
                        padding: "10px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span style={{ fontSize: "13px", fontWeight: 700, color: isSelected ? tier.color : "#d1d5db" }}>
                        {tier.label}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 800, color: tier.color }}>
                        +{tier.pts} pts
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Points Input */}
            <div>
              <label htmlFor="custom-points-input" style={{ fontSize: "12px", fontWeight: 600, color: "#d1d5db", display: "block", marginBottom: "6px" }}>
                Or Enter Custom Points:
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  id="custom-points-input"
                  type="number"
                  min="0"
                  max="500"
                  value={pointInput}
                  onChange={(e) => setPointInput(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{
                    flex: 1,
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: 700,
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: "13px", color: "#9ca3af", fontWeight: 600 }}>pts</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button
                type="button"
                onClick={() => !isUpdating && setEditingContrib(null)}
                disabled={isUpdating}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "10px",
                  padding: "10px 18px",
                  color: "#d1d5db",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: isUpdating ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePoints}
                disabled={isUpdating}
                style={{
                  background: "linear-gradient(135deg, #ff7518 0%, #ff8c33 100%)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 22px",
                  color: "#000000",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: isUpdating ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 14px rgba(255, 117, 24, 0.4)",
                  opacity: isUpdating ? 0.7 : 1,
                }}
              >
                {isUpdating ? "Updating..." : "Confirm & Award Points"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 10000,
            background: toast.type === "success" ? "#064e3b" : "#7f1d1d",
            border: `1px solid ${toast.type === "success" ? "#059669" : "#dc2626"}`,
            color: "#ffffff",
            borderRadius: "12px",
            padding: "12px 18px",
            fontSize: "13px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
          }}
        >
          <span>{toast.type === "success" ? "✅" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
