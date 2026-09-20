import { redirect } from "next/navigation";
import { getProjectAdminData, requireProjectAdminSession } from "@/lib/actions/project-admin";
import ProjectAdminUI from "./ProjectAdminUI";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProjectAdminPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let projectAdminData = null;
  let accessDenied = false;
  let currentRole = "contributor";
  let userEmail = "";

  const resolvedParams = props?.searchParams ? await props.searchParams : {};
  const targetAdmin = typeof resolvedParams?.admin === "string" ? resolvedParams.admin.trim() : undefined;

  try {
    const session = await requireProjectAdminSession();
    currentRole = session.profile.role;
    userEmail = session.user.email || "";
    projectAdminData = await getProjectAdminData(targetAdmin);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("sign in") || msg.includes("Unauthorized")) {
      redirect("/sign-in?next=/project-admin");
    }
    if (msg.includes("Forbidden") || msg.includes("elevated")) {
      accessDenied = true;
    }
  }

  // If user is logged in as a normal contributor or mentor
  if (accessDenied || !projectAdminData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050507",
          backgroundImage:
            "radial-gradient(ellipse 700px 350px at 50% 20%, rgba(255, 117, 24, 0.08), transparent 75%)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Inter', sans-serif",
          color: "#ffffff",
        }}
      >
        <Navbar />
        <div style={{ height: "96px", width: "100%", flexShrink: 0 }} aria-hidden="true" />

        <main
          style={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px 80px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "linear-gradient(180deg, #131317 0%, #0a0a0d 100%)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "24px",
              padding: "36px 32px",
              textAlign: "center",
              boxShadow: "0 28px 65px -12px rgba(0, 0, 0, 0.85)",
            }}
          >
            {/* Lock Icon */}
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "rgba(255, 117, 24, 0.12)",
                border: "1px solid rgba(255, 117, 24, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
                color: "#FF8822",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <div
              style={{
                display: "inline-block",
                background: "rgba(255, 117, 24, 0.1)",
                color: "#FF8822",
                border: "1px solid rgba(255, 117, 24, 0.3)",
                padding: "4px 12px",
                borderRadius: "14px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Project Admin Access Required
            </div>

            <h1
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "#ffffff",
                marginBottom: "10px",
                letterSpacing: "-0.02em",
              }}
            >
              Elevated Privileges Required
            </h1>

            <p style={{ fontSize: "14px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "24px" }}>
              This portal is restricted to <strong>Project Administrators</strong> and Super Admins.
              Contributors who maintain a competition project must be promoted to the <code>project-admin</code> role
              by the Super Admin on the <code>/admin</code> portal.
            </p>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "12px",
                padding: "12px 16px",
                fontSize: "12.5px",
                color: "#d1d5db",
                marginBottom: "24px",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#6b7280" }}>Your Account:</span>
                <span>{userEmail || "Signed In User"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Current Role:</span>
                <span style={{ color: "#FF8822", fontWeight: 600, textTransform: "capitalize" }}>
                  {currentRole}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link
                href="/dashboard"
                style={{
                  background: "linear-gradient(135deg, #FF7518 0%, #FF5500 100%)",
                  color: "white",
                  padding: "12px 20px",
                  borderRadius: "12px",
                  fontWeight: 700,
                  fontSize: "14px",
                  textDecoration: "none",
                  boxShadow: "0 4px 15px rgba(255, 117, 24, 0.35)",
                }}
              >
                Go to My Contributor Dashboard
              </Link>

              <Link
                href="/projects"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#d1d5db",
                  padding: "11px 20px",
                  borderRadius: "12px",
                  fontWeight: 600,
                  fontSize: "13.5px",
                  textDecoration: "none",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                Browse Competition Projects
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return <ProjectAdminUI initialData={projectAdminData} />;
}
