"use client";

import React, { useState } from "react";
import { linkGithubAccount, saveGithubUsername } from "@/lib/auth/client";

export default function GitHubLinkCard() {
  const [mode, setMode] = useState<"choice" | "manual" | "linking">("choice");
  const [manualUsername, setManualUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleOAuthLink = async () => {
    setError(null);
    setMode("linking");
    const res = await linkGithubAccount();
    if (res.error) {
      if (res.error.toLowerCase().includes("manual linking is disabled")) {
        setError(
          "Supabase has manual OAuth linking disabled in project settings. Please enter your GitHub username directly below."
        );
        setMode("manual");
      } else {
        setError(res.error);
        setMode("choice");
      }
    }
  };

  const handleManualSave = async () => {
    const username = manualUsername.replace(/^@/, "").trim();
    if (!username) {
      setError("Please enter a GitHub username.");
      return;
    }
    setError(null);
    setSaving(true);
    const res = await saveGithubUsername(username);
    if (res.error) {
      setError(res.error);
      setSaving(false);
    } else {
      // Reload to reflect the linked github across the dashboard
      window.location.reload();
    }
  };

  return (
    <div
      style={{
        width: "100%",
        background: "rgba(255, 117, 24, 0.04)",
        border: "1px solid rgba(255, 117, 24, 0.25)",
        borderRadius: "16px",
        padding: "24px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        {/* GitHub Icon */}
        <div
          style={{
            width: "40px",
            height: "40px",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
        </div>
        <div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "white",
              marginBottom: "2px",
            }}
          >
            Link Your GitHub Account
          </div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
            Required to track contributions, sync merged PRs, and earn points on
            the leaderboard.
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            marginBottom: "12px",
          }}
        >
          {error}
        </div>
      )}

      {mode === "choice" && (
        <div
          style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
        >
          <button
            onClick={handleOAuthLink}
            style={{
              flex: 1,
              minWidth: "180px",
              background: "var(--orange)",
              color: "white",
              padding: "12px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            Connect with GitHub
          </button>
          <button
            onClick={() => setMode("manual")}
            style={{
              flex: 1,
              minWidth: "180px",
              background: "rgba(255,255,255,0.05)",
              color: "#d1d5db",
              padding: "12px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Enter Username Manually
          </button>
        </div>
      )}

      {mode === "manual" && (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="e.g. me-sayanghosh"
            value={manualUsername}
            onChange={(e) => setManualUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleManualSave();
            }}
            style={{
              flex: 1,
              minWidth: "180px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              padding: "12px 16px",
              color: "white",
              fontSize: "14px",
              outline: "none",
            }}
            autoFocus
          />
          <button
            onClick={handleManualSave}
            disabled={saving}
            style={{
              background: "var(--orange)",
              color: "white",
              padding: "12px 20px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              transition: "all 0.2s",
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => {
              setMode("choice");
              setError(null);
            }}
            style={{
              background: "none",
              color: "#9ca3af",
              padding: "12px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 500,
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {mode === "linking" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 0",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              border: "2px solid rgba(255,117,24,0.3)",
              borderTopColor: "var(--orange)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <span style={{ color: "#9ca3af", fontSize: "14px" }}>
            Redirecting to GitHub...
          </span>
        </div>
      )}
    </div>
  );
}
