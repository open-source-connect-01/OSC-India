"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { createClient } from "@/lib/supabase/client";

interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  username: string;
  points: number;
  prs: number;
  projects: number;
  avatar: string;
  country: string;
  isFirst: boolean;
}

export default function LeaderboardUI({ initialUsers }: { initialUsers: LeaderboardUser[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [users, setUsers] = useState<LeaderboardUser[]>(initialUsers);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Sync state if props change
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchQuery) {
        params.set("q", searchQuery);
      } else {
        params.delete("q");
      }
      router.push(`/leaderboard?${params.toString()}`);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, router, searchParams]);

  // Supabase Realtime Subscription (Workflow 3 from plan.md)
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("leaderboard_feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          // Whenever an admin awards points, or a user syncs PRs, trigger live update
          router.refresh();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsLiveConnected(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const isSearching = Boolean(searchParams.get("q"));

  // Top 3 Podium Users (1st, 2nd, 3rd)
  const rank1 = users.find((u) => u.rank === 1);
  const rank2 = users.find((u) => u.rank === 2);
  const rank3 = users.find((u) => u.rank === 3);
  const others = users.filter((u) => u.rank > 3);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-white">
      <Navbar />
      <div style={{ height: "96px", width: "100%", flexShrink: 0 }} aria-hidden="true" />

      <main className="flex-grow flex flex-col items-center px-6" style={{ margin: "0 auto", maxWidth: "1080px", width: "100%", paddingBottom: "96px", paddingTop: "24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Realtime Live Pulse */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80", padding: "4px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: 600, marginBottom: "16px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isLiveConnected ? "#22c55e" : "#eab308", boxShadow: isLiveConnected ? "0 0 10px #22c55e" : "none" }} />
            {isLiveConnected ? "Realtime Live Feed Connected" : "Connecting Realtime..."}
          </div>

          <h1 style={{ fontSize: "clamp(32px, 5vw, 44px)", fontWeight: 800, marginBottom: "12px", letterSpacing: "-0.02em" }}>
            Community <span style={{ color: "var(--orange)" }}>Leaderboard</span>
          </h1>
          <p style={{ color: "#9ca3af", fontSize: "15px", maxWidth: "540px" }}>
            Real-time rankings powered by verified GitHub contributions and merit scores.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ width: "100%", maxWidth: "540px", marginBottom: "48px" }}>
          <input
            type="text"
            placeholder="Search contributors by name or @github..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
              fontSize: "14px",
              outline: "none",
              transition: "all 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--orange)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
          />
        </div>

        {/* Podium Layout (Ranks 2, 1, 3) */}
        {!isSearching && users.length >= 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "20px", marginBottom: "56px", width: "100%", flexWrap: "wrap" }}>
            {/* Rank 2 (Silver - Left) */}
            {rank2 && (
              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(203,213,225,0.3)",
                  borderRadius: "20px",
                  padding: "32px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "260px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                  position: "relative",
                  order: 1,
                }}
              >
                <div style={{ width: "72px", height: "72px", borderRadius: "50%", border: "2px solid #cbd5e1", overflow: "hidden", background: "#1c1c1f", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {rank2.avatar ? <img src={rank2.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>{rank2.name[0]}</span>}
                </div>
                <div style={{ color: "#cbd5e1", fontSize: "20px", fontWeight: 800, marginBottom: "4px" }}>🥈 #2</div>
                <div style={{ fontSize: "16px", fontWeight: 700, textAlign: "center", marginBottom: "2px" }}>{rank2.name}</div>
                <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "16px" }}>{rank2.username}</div>
                <div style={{ fontSize: "28px", fontWeight: 800 }}>{rank2.points}</div>
                <div style={{ color: "#9ca3af", fontSize: "11px", marginBottom: "8px" }}>Points</div>
                <div style={{ color: "#cbd5e1", fontSize: "12px", fontWeight: 600 }}>{rank2.prs} Merged PRs</div>
              </div>
            )}

            {/* Rank 1 (Gold - Center) */}
            {rank1 && (
              <div
                style={{
                  background: "rgba(255,117,24,0.04)",
                  border: "2px solid var(--orange)",
                  borderRadius: "24px",
                  padding: "44px 28px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "290px",
                  boxShadow: "0 15px 40px rgba(255,117,24,0.15)",
                  position: "relative",
                  transform: "translateY(-12px)",
                  order: 2,
                }}
              >
                <div style={{ position: "absolute", top: "-18px", fontSize: "28px" }}>👑</div>
                <div style={{ width: "88px", height: "88px", borderRadius: "50%", border: "3px solid var(--orange)", overflow: "hidden", background: "#1c1c1f", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(255,117,24,0.4)" }}>
                  {rank1.avatar ? <img src={rank1.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>{rank1.name[0]}</span>}
                </div>
                <div style={{ color: "var(--orange)", fontSize: "24px", fontWeight: 900, marginBottom: "4px" }}>🥇 #1</div>
                <div style={{ fontSize: "18px", fontWeight: 800, textAlign: "center", marginBottom: "2px" }}>{rank1.name}</div>
                <div style={{ color: "var(--orange)", fontSize: "13px", fontWeight: 500, marginBottom: "16px" }}>{rank1.username}</div>
                <div style={{ fontSize: "36px", fontWeight: 900, lineHeight: 1 }}>{rank1.points}</div>
                <div style={{ color: "#9ca3af", fontSize: "11px", marginBottom: "12px" }}>Points</div>
                <div style={{ color: "var(--orange)", fontSize: "13px", fontWeight: 700 }}>{rank1.prs} Merged PRs • {rank1.projects} Repos</div>
              </div>
            )}

            {/* Rank 3 (Bronze - Right) */}
            {rank3 && (
              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(217,119,6,0.3)",
                  borderRadius: "20px",
                  padding: "32px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "260px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                  position: "relative",
                  order: 3,
                }}
              >
                <div style={{ width: "72px", height: "72px", borderRadius: "50%", border: "2px solid #d97706", overflow: "hidden", background: "#1c1c1f", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {rank3.avatar ? <img src={rank3.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>{rank3.name[0]}</span>}
                </div>
                <div style={{ color: "#d97706", fontSize: "20px", fontWeight: 800, marginBottom: "4px" }}>🥉 #3</div>
                <div style={{ fontSize: "16px", fontWeight: 700, textAlign: "center", marginBottom: "2px" }}>{rank3.name}</div>
                <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "16px" }}>{rank3.username}</div>
                <div style={{ fontSize: "28px", fontWeight: 800 }}>{rank3.points}</div>
                <div style={{ color: "#9ca3af", fontSize: "11px", marginBottom: "8px" }}>Points</div>
                <div style={{ color: "#d97706", fontSize: "12px", fontWeight: 600 }}>{rank3.prs} Merged PRs</div>
              </div>
            )}
          </div>
        )}

        {/* List Section (Ranks 4 to 50 or Search Results) */}
        <div style={{ width: "100%", maxWidth: "860px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 12px 8px 12px", color: "#9ca3af", fontSize: "12px", fontWeight: 600 }}>
            <span>{isSearching ? `SEARCH RESULTS (${users.length})` : "TOP CONTRIBUTORS (RANKS 4 - 50)"}</span>
            <span>SCORE & PRs</span>
          </div>

          {(isSearching ? users : others).length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center", color: "#9ca3af", background: "rgba(255,255,255,0.02)", borderRadius: "16px" }}>
              No contributors found matching query.
            </div>
          ) : (
            (isSearching ? users : others).map((user) => (
              <div
                key={user.id}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "14px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px",
                  transition: "border-color 0.2s",
                }}
                className="hover:border-[rgba(255,117,24,0.3)] transition-colors"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, minWidth: "220px" }}>
                  {/* Rank */}
                  <div style={{ color: "var(--orange)", fontSize: "16px", fontWeight: 800, width: "36px" }}>
                    #{user.rank}
                  </div>

                  {/* Avatar */}
                  <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#1c1c1f", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", flexShrink: 0 }}>
                    {user.avatar ? (
                      <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "16px" }}>{user.name[0]}</span>
                    )}
                  </div>

                  {/* Name & Username */}
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 700 }}>{user.name}</div>
                    <div style={{ color: "#9ca3af", fontSize: "12px" }}>{user.username}</div>
                  </div>
                </div>

                {/* Score & PRs */}
                <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--orange)" }}>{user.points}</div>
                    <div style={{ color: "#9ca3af", fontSize: "10px" }}>Points</div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: "70px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700 }}>{user.prs} PRs</div>
                    <div style={{ color: "#9ca3af", fontSize: "10px" }}>{user.projects} Repos</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
