"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function HeroSection() {
  // Countdown timer calculation
  const [timeLeft, setTimeLeft] = useState({
    hours: "00",
    minutes: "00",
    seconds: "00",
  });

  useEffect(() => {
    const targetDate = new Date("2026-09-01T09:00:00+05:30").getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        const totalHours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({
          hours: String(totalHours).padStart(2, "0").slice(-2),
          minutes: String(minutes).padStart(2, "0"),
          seconds: String(seconds).padStart(2, "0"),
        });
      } else {
        setTimeLeft({
          hours: "00",
          minutes: "00",
          seconds: "00",
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="hero"
      className="hero-container"
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        background: "transparent",
        zIndex: 1,
      }}
    >
      {/* Hero Content Area */}
      <div
        className="hero-content"
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          padding: "110px clamp(32px, 8vw, 120px) 80px",
        }}
      >
        <div style={{ maxWidth: "720px" }}>
          {/* Main Headline */}
          <h1
            className="hero-title"
            style={{
              fontSize: "clamp(28px, 5.2vw, 64px)",
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: "-1.5px",
              marginBottom: "22px",
            }}
          >
            <div className="hero-title-line-1">
              <span className="tricolor-gradient">Open Source</span>
            </div>
            <div className="hero-title-line-2">
              <span className="tricolor-gradient">Connect India</span>
              <span className="hero-year-tag" style={{ color: "#FF8822" }}>
                2026
              </span>
            </div>
          </h1>

          {/* Subtitle */}
          <p
            className="hero-subtitle"
            style={{
              fontSize: "15.5px",
              color: "#e5e7eb",
              lineHeight: 1.65,
              marginBottom: "30px",
              maxWidth: "480px",
              fontWeight: 400,
            }}
          >
            Join India’s open source movement this September to learn, connect, and contribute alongside developers, maintainers, founders, and technology communities.
          </p>

          {/* CTA Buttons */}
          <div
            className="hero-cta-group"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            {/* Register Now Button */}
            <Link
              href="https://luma.com/3u22sml7"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-register-btn"
              style={{
                background: "#FF7518",
                color: "#ffffff",
                padding: "13px 28px",
                borderRadius: "10px",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "15px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 20px rgba(255, 96, 0, 0.4)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#e65600";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 25px rgba(255, 96, 0, 0.55)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#FF7518";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(255, 96, 0, 0.4)";
              }}
            >
              Register Now
            </Link>

            {/* Countdown Box */}
            <div
              className="hero-countdown-box"
              style={{
                background: "rgba(8, 8, 8, 0.9)",
                border: "1.5px solid #FF6500",
                borderRadius: "10px",
                padding: "11px 22px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 15px rgba(255, 101, 0, 0.15)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: "1.5px",
                }}
              >
                {timeLeft.hours} : {timeLeft.minutes} : {timeLeft.seconds}
              </span>
            </div>
          </div>

          {/* Date Label */}
          <div
            className="hero-date-box"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FF7518"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <circle cx="8" cy="15" r="1" fill="#FF7518" />
              <circle cx="12" cy="15" r="1" fill="#FF7518" />
              <circle cx="16" cy="15" r="1" fill="#FF7518" />
            </svg>
            <span
              className="hero-date-text"
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#FF7518",
                letterSpacing: "0.2px",
              }}
            >
              September 1-30, 2026
            </span>
          </div>
        </div>
      </div>

      {/* Downward Scroll Indicator Chevron matching reference Image 1 */}
      <div
        className="hero-scroll-indicator"
        style={{
          position: "absolute",
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Link
          href="#about"
          aria-label="Scroll down to About Us section"
          style={{
            color: "#FF7518",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            padding: "8px",
            transition: "all 0.2s ease",
          }}
          className="hover:scale-110 active:scale-95"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FF7518"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-bounce"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
