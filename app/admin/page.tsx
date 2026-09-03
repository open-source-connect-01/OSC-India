import { getAdminData } from "@/lib/actions/admin";
import AdminUI from "./AdminUI";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  try {
    const { profiles, metrics } = await getAdminData();
    return <AdminUI initialProfiles={profiles} initialMetrics={metrics} />;
  } catch (err: any) {
    console.error("Admin portal access denied:", err.message);
    redirect("/");
  }
}
