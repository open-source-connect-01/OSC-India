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

        {/* Top 2 Highlight Cards: 24/7 Community Support and 100% Open Source */}
        <div className="stats-features-grid">
          {/* Card 1: 24/7 Community Support */}
          <div className="stats-feature-card">
            <div className="stats-feature-number">24/7</div>
            <div className="stats-feature-title">Community Support</div>
            <div className="stats-feature-desc">Always available</div>
          </div>

          {/* Card 2: 100% Open Source */}
          <div className="stats-feature-card">
            <div className="stats-feature-number">100%</div>
            <div className="stats-feature-title">Open Source</div>
            <div className="stats-feature-desc">Completely transparent</div>
          </div>
        </div>

        {/* Bottom Card: 3-column metrics (50+ Active Projects, 500+ Contributors, 25+ Cities) */}
        <div className="stats-metrics-card">
          <div className="stats-metrics-inner">
            {/* 50+ Active Projects */}
            <div className="stats-metric-col">
              <div className="stats-metric-number">50+</div>
              <div className="stats-metric-label">Active Projects</div>
              <div className="stats-metric-divider" />
            </div>

            {/* 500+ Contributors */}
            <div className="stats-metric-col">
              <div className="stats-metric-number">500+</div>
              <div className="stats-metric-label">Contributors</div>
              <div className="stats-metric-divider" />
            </div>

            {/* 25+ Cities */}
            <div className="stats-metric-col">
              <div className="stats-metric-number">25+</div>
              <div className="stats-metric-label">Cities</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
