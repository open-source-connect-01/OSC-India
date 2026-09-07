"use client";

import React, { useState, useTransition } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { adminLoginAction } from "@/lib/actions/admin";

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ShieldAlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

export default function AdminLoginView() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await adminLoginAction(null, formData);
      if (res.success) {
        window.location.reload();
      } else {
        setErrorMessage(res.error || "Authentication failed. Please verify credentials.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-white">
      <Navbar />
      <div style={{ height: "96px", width: "100%", flexShrink: 0 }} aria-hidden="true" />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div 
          className="w-full max-w-[460px] rounded-[24px] border border-[rgba(255,255,255,0.15)] shadow-2xl relative overflow-hidden"
          style={{ 
            background: "#121214", 
            padding: "clamp(32px, 8vw, 48px) clamp(24px, 6vw, 40px)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(239, 68, 68, 0.08)"
          }}
        >
          {/* Subtle Top Accent Glow */}
          <div 
            style={{ 
              position: "absolute", 
              top: 0, 
              left: "10%", 
              right: "10%", 
              height: "2px", 
              background: "linear-gradient(90deg, transparent, #ef4444, transparent)" 
            }} 
          />

          {/* Security Badge */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div 
              style={{ 
                display: "inline-flex", 
                alignItems: "center", 
                gap: "8px", 
                background: "rgba(239,68,68,0.12)", 
                border: "1px solid rgba(239,68,68,0.3)", 
                color: "#ef4444", 
                padding: "6px 14px", 
                borderRadius: "20px", 
                fontSize: "11px", 
                fontWeight: 700, 
                letterSpacing: "0.08em",
                marginBottom: "20px" 
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
              RESTRICTED • ADMIN PORTAL
            </div>

            <div 
              style={{ 
                width: "56px", 
                height: "56px", 
                borderRadius: "16px", 
                background: "rgba(255,255,255,0.03)", 
                border: "1px solid rgba(255,255,255,0.1)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                margin: "0 auto 16px",
                color: "#ef4444"
              }}
            >
              <LockIcon className="w-6 h-6" />
            </div>

            <h1 className="text-[26px] font-bold text-white mb-2 tracking-tight">Admin Authentication</h1>
            <p className="text-[13.5px] text-gray-400">
              Enter your designated administrative credentials to unlock the Command Center.
            </p>
          </div>

          {errorMessage && (
            <div 
              style={{ 
                background: "rgba(239,68,68,0.1)", 
                border: "1px solid rgba(239,68,68,0.3)", 
                color: "#ef4444", 
                padding: "12px 14px", 
                borderRadius: "12px", 
                fontSize: "13px", 
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <ShieldAlertIcon className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Email Field */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label className="text-[13px] text-gray-300 font-medium ml-1">Admin Email</label>
              <input 
                name="email"
                type="email" 
                required
                autoFocus
                autoComplete="username"
                placeholder="admin@osc-india.org"
                className="w-full bg-[#1c1c1f] text-white text-[14px] placeholder-gray-500 rounded-xl border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[#ef4444] focus:ring-1 focus:ring-[#ef4444] transition-all"
                style={{ padding: "14px 16px" }}
              />
            </div>

            {/* Password Field */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label className="text-[13px] text-gray-300 font-medium ml-1">Admin Master Password</label>
              <div className="relative">
                <input 
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Enter master password"
                  className="w-full bg-[#1c1c1f] text-white text-[14px] placeholder-gray-500 rounded-xl border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[#ef4444] focus:ring-1 focus:ring-[#ef4444] transition-all"
                  style={{ padding: "14px 16px", paddingRight: "48px" }}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors bg-transparent border-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon className="w-[18px] h-[18px]" /> : <EyeIcon className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isPending}
              className="w-full bg-[#ef4444] hover:bg-[#dc2626] text-white text-[15px] font-semibold rounded-xl transition-all shadow-lg shadow-red-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-none"
              style={{ padding: "16px", marginTop: "8px" }}
            >
              {isPending ? (
                <>
                  <div style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Unlock Command Center</span>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div style={{ marginTop: "28px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px", textAlign: "center" }}>
            <p className="text-[12px] text-gray-500 leading-relaxed">
              🔒 Independent Security Boundary. This area does not accept public OAuth logins.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
