"use client";

import { useState } from "react";
import Link from "next/link";

export default function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes("@")) {
      setNewsletterStatus({
        type: "error",
        message: "Please enter a valid email address.",
      });
      return;
    }
    setNewsletterStatus({
      type: "success",
      message: "Thank you for subscribing!",
    });
    setNewsletterEmail("");
    setTimeout(() => setNewsletterStatus(null), 4000);
  };

  const socialLinks = [
    {
      name: "Twitter",
      href: "https://x.com/osconnect1",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      href: "https://www.linkedin.com/company/open-source-connect/",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
    },
    {
      name: "GitHub",
      href: "https://github.com/Open-Source-Connect/",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
      ),
    },
    {
      name: "Instagram",
      href: "https://www.instagram.com/osconnect.official/",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      ),
    },
  ];

  const resourceLinks = [
    { name: "Documentation", href: "#" },
    { name: "Projects", href: "/projects" },
    { name: "Community Guidelines", href: "/about" },
    { name: "Code of Conduct", href: "/about" },
    { name: "Swags", href: "#" },
    { name: "Help Center", href: "#" },
  ];

  const applyLinks = [
    { name: "Speak With Us", href: "https://luma.com/3u22sml7" },
    { name: "Become a Mentor", href: "#" },
    { name: "Become Project Admin", href: "#" },
    { name: "Become Campus Lead", href: "#" },
    { name: "Become State Lead", href: "#" },
    { name: "Become Sponsor", href: "/#sponsors" },
  ];

  return (
    <footer
      className="footer-section"
      style={{
        background: "#000000",
        borderTop: "1.5px solid #FF6500",
        padding: "64px clamp(24px, 6vw, 100px) 36px",
        position: "relative",
        zIndex: 10,
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
        {/* Main 4-Column Grid */}
        <div className="footer-main-grid">
          {/* Column 1: Brand */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Link
              href="/"
              style={{
                textDecoration: "none",
                display: "inline-block",
                marginBottom: "20px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Open Source Connect India"
                className="navbar-logo"
              />
            </Link>
            <p
              style={{
                fontSize: "14px",
                color: "#9ca3af",
                lineHeight: 1.65,
                maxWidth: "320px",
                marginBottom: "28px",
              }}
            >
              The ultimate destination for open source enthusiasts. Connecting innovators, developers, and mentors in a India ecosystem.
            </p>
            {/* Social Icons */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {socialLinks.map((social) => (
                <Link
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="footer-social-btn"
                >
                  {social.icon}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 2: RESOURCES */}
          <div>
            <h4
              style={{
                fontWeight: 700,
                fontSize: "12px",
                color: "#9ca3af",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                marginBottom: "20px",
              }}
            >
              RESOURCES
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {resourceLinks.map((item) => (
                <li key={item.name} style={{ marginBottom: "14px" }}>
                  <Link
                    href={item.href}
                    style={{
                      fontSize: "14px",
                      color: "#9ca3af",
                      textDecoration: "none",
                      transition: "color 0.2s ease",
                    }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#ffffff")}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#9ca3af")}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: APPLY */}
          <div>
            <h4
              style={{
                fontWeight: 700,
                fontSize: "12px",
                color: "#9ca3af",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                marginBottom: "20px",
              }}
            >
              APPLY
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {applyLinks.map((item) => (
                <li key={item.name} style={{ marginBottom: "14px" }}>
                  <Link
                    href={item.href}
                    style={{
                      fontSize: "14px",
                      color: "#9ca3af",
                      textDecoration: "none",
                      transition: "color 0.2s ease",
                    }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#ffffff")}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#9ca3af")}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Newsletter Card */}
          <div>
            <div
              style={{
                background: "#0c0c0e",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "20px",
                padding: "24px 22px",
                width: "100%",
                maxWidth: "380px",
              }}
            >
              <h4
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#ffffff",
                  marginBottom: "8px",
                  letterSpacing: "-0.2px",
                }}
              >
                Stay in the Loop
              </h4>
              <p
                style={{
                  fontSize: "13px",
                  color: "#9ca3af",
                  lineHeight: 1.55,
                  marginBottom: "18px",
                }}
              >
                Join our newsletter for the latest updates and early announcements.
              </p>

              <form onSubmit={handleNewsletterSubmit}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "#161618",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "12px",
                    padding: "4px 4px 4px 14px",
                  }}
                >
                  <input
                    type="email"
                    placeholder="Email address"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "#ffffff",
                      fontSize: "13.5px",
                      padding: "8px 0",
                      minWidth: 0,
                    }}
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "#FF6500",
                      border: "none",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "transform 0.15s ease, background 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#FF7518")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#FF6500")}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
                {newsletterStatus && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: newsletterStatus.type === "success" ? "#22c55e" : "#ef4444",
                      marginTop: "8px",
                    }}
                  >
                    {newsletterStatus.message}
                  </div>
                )}
              </form>

              <p
                style={{
                  fontSize: "11.5px",
                  color: "#6b7280",
                  marginTop: "14px",
                  marginBottom: 0,
                }}
              >
                * No spam, only high-quality tech updates.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Legal Links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            marginTop: "64px",
          }}
        >
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
            © 2026 Open Source Connect India. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: "28px", alignItems: "center" }}>
            <Link
              href="/privacy"
              style={{
                fontSize: "13px",
                color: "#9ca3af",
                textDecoration: "none",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#ffffff")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#9ca3af")}
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              style={{
                fontSize: "13px",
                color: "#9ca3af",
                textDecoration: "none",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#ffffff")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#9ca3af")}
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
