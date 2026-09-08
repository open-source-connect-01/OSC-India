"use client";

import React from "react";

export default function StatsSection() {
  return (
    <section
      id="about"
      className="stats-section"
      style={{
        background: "transparent",
        padding: "80px clamp(20px, 5vw, 48px) 100px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Heading */}
        <h2
          style={{
            color: "#ffffff",
            fontSize: "clamp(32px, 5vw, 44px)",
            fontWeight: 800,
            textAlign: "center",
            letterSpacing: "-0.02em",
            marginBottom: "14px",
            lineHeight: 1.2,
          }}
        >
          About Us
        </h2>

        {/* Orange Underline Accent Bar */}
        <div
          style={{
            width: "72px",
            height: "4px",
            backgroundColor: "var(--orange)",
            borderRadius: "9999px",
            margin: "0 auto 36px",
          }}
        />

        {/* Description Paragraphs */}
        <div style={{ marginBottom: "40px" }}>
          <p
            style={{
              color: "#9ca3af",
              fontSize: "clamp(14.5px, 2vw, 15.5px)",
              lineHeight: "1.7",
              marginBottom: "18px",
            }}
          >
            Open Source Connect India is a community-driven event that brings together developers, designers, and open-source enthusiasts from across the country. Our goal is to foster collaboration, learning, and innovation through projects, workshops, and networking.
          </p>
          <p
            style={{
              color: "#9ca3af",
              fontSize: "clamp(14.5px, 2vw, 15.5px)",
              lineHeight: "1.7",
              margin: 0,
            }}
          >
            Join us this August to connect, contribute, and grow with the open-source community. Whether you&apos;re a seasoned developer or just starting your journey, there&apos;s a place for you here.
          </p>
        </div>

        {/* Top 2 Cards: 24/7 Community Support and 100% Open Source */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          {/* Card 1: 24/7 Community Support */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "clamp(24px, 4vw, 32px)",
              transition: "border-color 0.2s ease, transform 0.2s ease",
            }}
            className="hover:border-white/20 transition-all"
          >
            <div
              style={{
                fontSize: "clamp(32px, 4.5vw, 38px)",
                fontWeight: 800,
                color: "var(--orange)",
                marginBottom: "8px",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              24/7
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#ffffff",
                marginBottom: "4px",
              }}
            >
              Community Support
            </div>
            <div
              style={{
                fontSize: "13.5px",
                color: "#9ca3af",
              }}
            >
              Always available
            </div>
          </div>

          {/* Card 2: 100% Open Source */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "clamp(24px, 4vw, 32px)",
              transition: "border-color 0.2s ease, transform 0.2s ease",
            }}
            className="hover:border-white/20 transition-all"
          >
            <div
              style={{
                fontSize: "clamp(32px, 4.5vw, 38px)",
                fontWeight: 800,
                color: "var(--orange)",
                marginBottom: "8px",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              100%
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#ffffff",
                marginBottom: "4px",
              }}
            >
              Open Source
            </div>
            <div
              style={{
                fontSize: "13.5px",
                color: "#9ca3af",
              }}
            >
              Completely transparent
            </div>
          </div>
        </div>

        {/* Bottom Card: 3-column metrics (50+ Active Projects, 500+ Contributors, 25+ Cities) */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "clamp(24px, 4vw, 32px)",
            transition: "border-color 0.2s ease, transform 0.2s ease",
          }}
          className="hover:border-white/20 transition-all"
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "24px",
              textAlign: "center",
            }}
          >
            {/* 50+ Active Projects */}
            <div>
              <div
                style={{
                  fontSize: "clamp(30px, 4vw, 36px)",
                  fontWeight: 800,
                  color: "var(--orange)",
                  marginBottom: "6px",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                50+
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#9ca3af",
                  fontWeight: 500,
                }}
              >
                Active Projects
              </div>
            </div>

            {/* 500+ Contributors */}
            <div>
              <div
                style={{
                  fontSize: "clamp(30px, 4vw, 36px)",
                  fontWeight: 800,
                  color: "var(--orange)",
                  marginBottom: "6px",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                500+
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#9ca3af",
                  fontWeight: 500,
                }}
              >
                Contributors
              </div>
            </div>

            {/* 25+ Cities */}
            <div>
              <div
                style={{
                  fontSize: "clamp(30px, 4vw, 36px)",
                  fontWeight: 800,
                  color: "var(--orange)",
                  marginBottom: "6px",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                25+
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#9ca3af",
                  fontWeight: 500,
                }}
              >
                Cities
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
