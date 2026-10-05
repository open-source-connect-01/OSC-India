import { getAdminData } from "@/lib/actions/admin";
import { verifyAdminSession } from "@/lib/auth/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminUI from "./AdminUI";
import AdminLoginView from "./AdminLoginView";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isCookieSessionValid = await verifyAdminSession();

  let hasElevatedAccess = isCookieSessionValid;
  if (!hasElevatedAccess) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const rootAdminEmail = (process.env.ADMIN_PORTAL_EMAIL || "sayanghosh1887@gmail.com").toLowerCase().trim();
        const userEmail = (user.email || user.user_metadata?.email || "").toLowerCase().trim();
        if (userEmail === rootAdminEmail) {
          hasElevatedAccess = true;
        } else {
          const admin = createAdminClient();
          const { data: prof } = await admin
            .from("profiles")
            .select("role, is_admin")
            .or(`user_id.eq.${user.id},id.eq.${user.id}`)
            .maybeSingle();
          if (prof?.role === "admin" || prof?.is_admin) {
            hasElevatedAccess = true;
          }
        }
      }
    } catch {
      // Non-blocking
    }
  }

  if (!hasElevatedAccess) {
    return <AdminLoginView />;
  }

  let adminData = null;
  try {
    adminData = await getAdminData();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load admin data";
    console.error("Admin portal data loading error:", msg);
  }

  if (!adminData) {
    return <AdminLoginView />;
  }

  return (
    <AdminUI
      initialProfiles={adminData.profiles}
      initialMetrics={adminData.metrics}
      initialProjects={adminData.projects}
      initialPendingProjects={adminData.pendingProjects}
    />
  );
}
