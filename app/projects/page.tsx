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
        {projects.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 24px",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "16px",
              border: "1px dashed rgba(255, 255, 255, 0.1)",
              maxWidth: "540px",
              margin: "0 auto 60px",
            }}
          >
            <p style={{ fontSize: "16px", color: "#9ca3af", margin: 0 }}>
              No projects added yet.
            </p>
          </div>
        ) : (
          <div className="projects-grid">
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
        )}
      </div>

      <Footer />
    </main>
  );
}
