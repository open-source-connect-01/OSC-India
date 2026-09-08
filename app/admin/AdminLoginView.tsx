"use client";

import React, { useState, useTransition } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { adminLoginAction } from "@/lib/actions/admin";

function ShieldLockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <rect x="9" y="10" width="6" height="5" rx="1" />
      <path d="M10 10V8a2 2 0 1 1 4 0v2" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
      <path d="m21 2-9.6 9.6" />
      <circle cx="7.5" cy="16.5" r="5.5" />
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
    <div className="min-h-screen bg-[#050507] flex flex-col font-sans text-white relative selection:bg-[#FF7518]/30">
      <Navbar />
      <div style={{ height: "96px", width: "100%", flexShrink: 0 }} aria-hidden="true" />

      {/* Ambient Cyber Aura Background */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{
          background: "radial-gradient(ellipse 70% 45% at 50% 28%, rgba(255, 117, 24, 0.09) 0%, rgba(10, 10, 14, 0) 70%)",
        }}
      />

      <main className="flex-grow flex items-center justify-center px-4 py-16 relative z-10">
        <div 
          className="w-full max-w-[460px] rounded-[24px] relative overflow-hidden"
          style={{ 
            background: "linear-gradient(180deg, #131317 0%, #0a0a0d 100%)", 
            padding: "clamp(32px, 7vw, 44px) clamp(24px, 6vw, 36px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 28px 65px -12px rgba(0, 0, 0, 0.85), 0 0 50px rgba(255, 117, 24, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* Top Brand Ambient Line */}
          <div 
            style={{ 
              position: "absolute", 
              top: 0, 
              left: "15%", 
              right: "15%", 
              height: "2px", 
              background: "linear-gradient(90deg, transparent, #FF7518, transparent)" 
            }} 
          />

          {/* Security Badge */}
          <div style={{ textAlign: "center", marginBottom: "26px" }}>
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
                marginBottom: "20px" 
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
              RESTRICTED • ADMIN COMMAND
            </div>

            {/* Glowing Emblem */}
            <div 
              style={{ 
                width: "60px", 
                height: "60px", 
                borderRadius: "18px", 
                background: "linear-gradient(135deg, rgba(255, 117, 24, 0.15) 0%, rgba(255, 255, 255, 0.02) 100%)", 
                border: "1px solid rgba(255, 117, 24, 0.3)", 
                boxShadow: "0 8px 24px -4px rgba(255, 117, 24, 0.2)",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                margin: "0 auto 16px",
                color: "#FF8822"
              }}
            >
              <ShieldLockIcon className="w-7 h-7" />
            </div>

            <h1 className="text-[25px] font-extrabold text-white mb-2 tracking-tight">Admin Authentication</h1>
            <p className="text-[13.5px] text-gray-400 leading-relaxed max-w-[340px] mx-auto">
              Enter your designated administrative credentials to unlock the Command Center.
            </p>
          </div>

          {errorMessage && (
            <div 
              style={{ 
                background: "rgba(239, 68, 68, 0.1)", 
                border: "1px solid rgba(239, 68, 68, 0.25)", 
                color: "#f87171", 
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
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Email Field */}
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              <label className="text-[12.5px] text-gray-300 font-semibold tracking-wide ml-0.5">Admin Email</label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-gray-500 pointer-events-none flex items-center">
                  <MailIcon className="w-4 h-4" />
                </div>
                <input 
                  name="email"
                  type="email" 
                  required
                  autoComplete="username"
                  placeholder="admin@osc-india.org"
                  className="w-full text-white text-[14px] placeholder-gray-500 rounded-xl transition-all"
                  style={{ 
                    padding: "13px 16px 13px 40px",
                    background: "rgba(255, 255, 255, 0.035)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#FF7518";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 117, 24, 0.14)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              <label className="text-[12.5px] text-gray-300 font-semibold tracking-wide ml-0.5">Admin Master Password</label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-gray-500 pointer-events-none flex items-center">
                  <KeyIcon className="w-4 h-4" />
                </div>
                <input 
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Enter master password"
                  className="w-full text-white text-[14px] placeholder-gray-500 rounded-xl transition-all"
                  style={{ 
                    padding: "13px 44px 13px 40px",
                    background: "rgba(255, 255, 255, 0.035)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#FF7518";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 117, 24, 0.14)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-gray-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer flex items-center"
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isPending}
              className="w-full text-white text-[14.5px] font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-none"
              style={{ 
                padding: "14px", 
                marginTop: "6px",
                background: "linear-gradient(135deg, #FF7518 0%, #FF5500 100%)",
                boxShadow: "0 10px 24px -4px rgba(255, 117, 24, 0.35)",
              }}
              onMouseEnter={(e) => {
                if (!isPending) (e.currentTarget as HTMLElement).style.filter = "brightness(1.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.filter = "none";
              }}
            >
              {isPending ? (
                <>
                  <div style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Unlock Command Center</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div style={{ marginTop: "26px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "18px", textAlign: "center" }}>
            <p className="text-[12px] text-gray-500 leading-relaxed flex items-center justify-center gap-1.5">
              <span></span>
              <span>Independent Security Boundary • Encrypted Access</span>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
