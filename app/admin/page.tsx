import { getAdminData } from "@/lib/actions/admin";
import { verifyAdminSession } from "@/lib/auth/admin-auth";
import AdminUI from "./AdminUI";
import AdminLoginView from "./AdminLoginView";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isSessionValid = await verifyAdminSession();

  if (!isSessionValid) {
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
    />
  );
}
