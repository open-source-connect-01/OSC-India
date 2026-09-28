"use client";

export default function ProjectsSection() {
  const projects = [
    {
      name: "Truxify – Broker-Free Freight Marketplace",
      language: "Flutter",
      dotColor: "#FF7518",
      accentColor: "#FF7518",
      desc: "An open-source, broker-free freight marketplace connecting manufacturers directly with truck drivers for transparent pricing and live tracking.",
      stars: "40",
      forks: "195",
    },
    {
      name: "iloveAgents",
      language: "JavaScript",
      dotColor: "#ec4899",
      accentColor: "#ec4899",
      desc: "AI agents worth falling in love with. An open-source ecosystem of specialized autonomous agents built by the community.",
      stars: "117",
      forks: "200",
    },
    {
      name: "CreatorOS",
      language: "Node.js",
      dotColor: "#f59e0b",
      accentColor: "#f59e0b",
      desc: "An open-source, all-in-one operating system dashboard built for creators to manage workflows, analytics, and social APIs.",
      stars: "42",
      forks: "92",
    },
    {
      name: "AI Stock Analyzer",
      language: "Python",
      dotColor: "#10b981",
      accentColor: "#10b981",
      desc: "A web-based stock analysis application offering intelligent interactive charts, technical indicators, and NLP sentiment analysis.",
      stars: "37",
      forks: "108",
    },
    {
      name: "WalletWise",
      language: "React",
      dotColor: "#8b5cf6",
      accentColor: "#8b5cf6",
      desc: "Comprehensive personal finance and budget tracking platform featuring behavioral insights and AI-driven expense analytics.",
      stars: "29",
      forks: "87",
    },
    {
      name: "TCalc — Local-First AI Coding Context & Token Intelligence Toolkit",
      language: "TypeScript",
      dotColor: "#06b6d4",
      accentColor: "#06b6d4",
      desc: "A local-first developer toolkit that helps developers understand token consumption and context windows across coding agents.",
      stars: "15",
      forks: "16",
    },
  ];

  return (
    <section
      id="projects"
      className="projects-section"
      style={{
        background: "#080808",
        padding: "80px clamp(32px, 8vw, 120px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ width: "100%", position: "relative" }}>
        {/* Heading */}
        <h2
          style={{
            fontSize: "clamp(28px, 4.5vw, 48px)",
            fontWeight: 800,
            letterSpacing: "-0.5px",
            lineHeight: 1.15,
            marginBottom: "16px",
          }}
        >
          <span style={{ color: "#ffffff" }}>Featured Projects .</span>
          
        </h2>

        <p
          style={{
            color: "#9ca3af",
            fontSize: "15px",
            lineHeight: 1.6,
            marginBottom: "40px",
            maxWidth: "520px",
          }}
        >
          Discover innovative open source projects that are shaping the future of technology.
        </p>

        {/* Projects Container with Horizontal Alignment on Mobile */}
        <div style={{ position: "relative", width: "100%" }}>
          {/* Projects Cards Container */}
          <div
            className="projects-cards-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {projects.map((project, i) => (
              <div
                key={i}
                className="project-card-item"
                style={{
                  backgroundColor: "#131315",
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.07)",
                  borderTop: `3.5px solid ${project.accentColor}`,
                  padding: "30px 28px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "260px",
                }}
              >
                <div>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "20px",
                    }}
                  >
                    <svg
                      style={{ width: "20px", height: "20px", color: "#e5e7eb" }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="18" r="3" />
                      <circle cx="6" cy="6" r="3" />
                      <circle cx="18" cy="6" r="3" />
                      <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" />
                      <path d="M12 12v3" />
                    </svg>
                  </div>

                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "#ffffff",
                      marginBottom: "8px",
                      letterSpacing: "-0.2px",
                      lineHeight: 1.3,
                    }}
                  >
                    {project.name}
                  </h3>

                  <p
                    style={{
                      fontSize: "13.5px",
                      color: "#9ca3af",
                      lineHeight: 1.6,
                      marginBottom: "20px",
                    }}
                  >
                    {project.desc}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "24px",
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: project.dotColor,
                        display: "inline-block",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#e5e7eb",
                      }}
                    >
                      {project.language}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginTop: "auto",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "18px",
                      color: "#9ca3af",
                      fontSize: "13.5px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <svg
                        style={{ width: "16px", height: "16px", color: "#9ca3af" }}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span style={{ fontWeight: 500 }}>{project.stars}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <svg
                        style={{ width: "16px", height: "16px", color: "#9ca3af" }}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="18" r="3" />
                        <circle cx="6" cy="6" r="3" />
                        <circle cx="18" cy="6" r="3" />
                        <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" />
                        <path d="M12 12v3" />
                      </svg>
                      <span style={{ fontWeight: 500 }}>{project.forks}</span>
                    </div>
                  </div>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "#f97316",
                      fontWeight: 600,
                      fontSize: "14px",
                    }}
                  >
                    View Project
                    <svg
                      style={{ width: "15px", height: "15px" }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}
