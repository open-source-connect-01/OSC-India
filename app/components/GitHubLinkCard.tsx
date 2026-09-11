"use client";

import React, { useState } from "react";
import { linkGithubAccount } from "@/lib/auth/client";

interface GitHubLinkCardProps {
  userId?: string;
}

export default function GitHubLinkCard({ userId }: GitHubLinkCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    setIsLoading(true);
    const res = await linkGithubAccount(userId);
    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        background: "linear-gradient(180deg, rgba(255, 117, 24, 0.06) 0%, rgba(255, 117, 24, 0.02) 100%)",
        border: "1px solid rgba(255, 117, 24, 0.25)",
        borderRadius: "16px",
        padding: "clamp(16px, 3vw, 24px)",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: "240px", flex: 1 }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "white", marginBottom: "2px" }}>
            Connect Your GitHub Account
          </div>
          <div style={{ fontSize: "12.5px", color: "#9ca3af" }}>
            Authorize GitHub to verify contributions, track merged PRs, and calculate your leaderboard score.
          </div>
          {error && (
            <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "6px" }}>
              {error}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleConnect}
        disabled={isLoading}
        className="flex items-center justify-center gap-2.5 bg-[#1c1c1f] hover:bg-[#252529] active:scale-[0.99] text-white text-[13.5px] font-medium rounded-xl border border-[rgba(255,255,255,0.14)] hover:border-[rgba(255,117,24,0.5)] transition-all cursor-pointer disabled:opacity-60 shadow-sm"
        style={{
          padding: "11px 20px",
          minWidth: "180px",
        }}
      >
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "14px",
                height: "14px",
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "#ffffff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span>Connecting...</span>
          </div>
        ) : (
          <>
            <svg className="w-[16px] h-[16px] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>Connect with GitHub</span>
          </>
        )}
      </button>
    </div>
  );
}
