"use client";

import React, { useState, useEffect, Suspense } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useSearchParams } from "next/navigation";
import { signInWithOAuth, signOutClient, getClientProfile, type ClientProfilePayload } from "@/lib/auth/client";

function SignInContent() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextUrl =
    rawNext && !rawNext.startsWith("/sign-in") && !rawNext.startsWith("/sign-up")
      ? rawNext
      : "/dashboard";
  const urlError = searchParams.get("error");

  const [profile, setProfile] = useState<ClientProfilePayload | null | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(urlError || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getClientProfile().then((res) => setProfile(res || null));
  }, []);

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    setErrorMessage(null);
    setIsLoading(true);
    const res = await signInWithOAuth(provider, nextUrl);
    if (res?.error) {
      setErrorMessage(res.error);
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="w-full max-w-[440px] rounded-[24px] border border-[rgba(255,255,255,0.18)] shadow-2xl"
      style={{ background: "#121214", padding: "clamp(32px, 8vw, 48px) clamp(20px, 6vw, 40px)", display: "flex", flexDirection: "column", justifyContent: "center" }}
    >
      {profile === undefined ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "40px 0" }}>
          <div style={{ width: "40px", height: "40px", border: "3px solid rgba(255,117,24,0.2)", borderTopColor: "var(--orange)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      ) : profile ? (
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeIn 0.5s ease-out" }}>
          <div style={{ 
            width: "96px", height: "96px", borderRadius: "50%", overflow: "hidden", 
            border: "3px solid rgba(255, 117, 24, 0.8)", marginBottom: "20px", background: "#1c1c1f", 
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 30px rgba(255, 117, 24, 0.15)"
          }}>
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: "36px", color: "white", fontWeight: 600 }}>{profile.name?.[0] || "U"}</span>
            )}
          </div>
          
          <h1 className="text-[28px] font-bold text-white mb-1 tracking-tight">Welcome back, {profile.name?.split(" ")[0] || "there"}!</h1>
          <p className="text-[15px] text-gray-400 font-medium mb-8">You are already signed in to your account.</p>
          
          <a 
            href={nextUrl}
            className="w-full bg-[var(--orange)] hover:bg-[var(--orange-dark)] text-white text-[15px] font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/15 flex items-center justify-center no-underline"
            style={{ padding: "16px", marginBottom: "24px" }}
          >
            Go to Dashboard
          </a>
          
          <button 
            type="button"
            onClick={() => signOutClient("/")}
            className="text-[14px] text-gray-500 hover:text-white transition-colors underline decoration-gray-700 hover:decoration-white underline-offset-4 bg-transparent border-none cursor-pointer"
          >
            Sign out and use a different account
          </button>
        </div>
      ) : (
        <>
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <h1 className="text-[28px] font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-[14px] text-[var(--text-secondary)]">Sign in to your OSCI account</p>
          </div>

          {errorMessage && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", marginBottom: "20px" }}>
              {errorMessage}
            </div>
          )}

          {/* OAuth Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <button 
              type="button"
              onClick={() => handleOAuthSignIn("github")}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 w-full bg-[#1c1c1f] hover:bg-[#252529] text-white text-[14px] font-medium rounded-xl border border-[rgba(255,255,255,0.12)] transition-all cursor-pointer disabled:opacity-50 hover:border-[rgba(255,255,255,0.25)]"
              style={{ padding: "16px" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              Sign in with GitHub
            </button>
            <button 
              type="button"
              onClick={() => handleOAuthSignIn("google")}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-100 text-gray-900 text-[14px] font-medium rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-md"
              style={{ padding: "16px" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans">
      <Navbar />
      <div style={{ height: "72px", width: "100%", flexShrink: 0 }} aria-hidden="true" />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <Suspense fallback={
          <div style={{ width: "40px", height: "40px", border: "3px solid rgba(255,117,24,0.2)", borderTopColor: "var(--orange)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        }>
          <SignInContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
