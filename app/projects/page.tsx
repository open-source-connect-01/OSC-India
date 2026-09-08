import ProjectCard from "../components/ProjectCard";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getProjects } from "@/lib/actions/projects";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <main className="min-h-screen bg-[var(--bg)] flex flex-col">
      <Navbar />

      {/* Spacer for fixed navbar */}
      <div style={{ height: "96px", flexShrink: 0 }} aria-hidden="true" />

      {/* Page wrapper with side padding applied via CSS */}
      <div className="projects-page-wrapper">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h1
            style={{
              fontSize: "clamp(28px, 6vw, 52px)",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-1px",
              lineHeight: 1.15,
              marginBottom: "12px",
            }}
          >
            Our Projects
          </h1>
          <p
            style={{
              fontSize: "clamp(13.5px, 2.5vw, 18px)",
              color: "#9ca3af",
              lineHeight: 1.65,
              maxWidth: "520px",
              margin: "0 auto",
            }}
          >
            Discover innovative open source projects that are shaping the future of technology
          </p>
        </div>

        {/* Cards grid — responsive via CSS class */}
        <div className="projects-grid" style={{ marginBottom: "40px" }}>
          {projects.map((project) => (
            <ProjectCard 
              key={project.id || project.githubUrl} 
              title={project.title}
              description={project.description}
              language={project.language}
              stars={project.stars || "0"}
              forks={project.forks || "0"}
              githubUrl={project.githubUrl}
              accentColor={project.accentColor || "#FF7518"}
            />
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <a 
            href="https://github.com/open-source-connect-01" 
            target="_blank" 
            rel="noopener noreferrer"
            className="projects-cta-btn"
            style={{ textDecoration: "none" }}
          >
            Explore All Repositories
          </a>
        </div>
      </div>

      <Footer />
    </main>
  );
}
