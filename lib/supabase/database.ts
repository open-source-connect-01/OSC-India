import { createClient } from "./server";
import { createAdminClient } from "./admin";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  github: string | null;
  linkedin: string | null;
  phone: string | null;
  country_code: string | null;
  country: string | null;
  nexfellow_id: string | null;
  avatar_url: string | null;
  role: "contributor" | "mentor" | "project-admin" | "admin";
  is_admin: boolean;
  score: number;
  merged_prs: number;
  projects_count: number;
  badges_created: number;
  tech_stack?: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Fetches the user profile by user UUID.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    // If not found with user client, try admin client in case of RLS edge cases
    const admin = createAdminClient();
    const { data: adminData } = await admin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    return (adminData as Profile) || null;
  }

  return data as Profile;
}

/**
 * Updates an existing profile.
 */
export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, profile: data as Profile };
}

/**
 * Increments the badge count for a user, enforcing the 3-badge maximum limit.
 */
export async function incrementBadgeCount(userId: string): Promise<{ success: boolean; error?: string; count?: number }> {
  const admin = createAdminClient();
  
  // 1. Fetch current count
  const { data: profile, error: fetchErr } = await admin
    .from("profiles")
    .select("badges_created")
    .eq("id", userId)
    .single();

  if (fetchErr || !profile) {
    return { success: false, error: "Profile not found" };
  }

  const currentCount = profile.badges_created || 0;
  if (currentCount >= 3) {
    return {
      success: false,
      error: "Maximum badge creation limit reached (3 badges per account).",
      count: currentCount,
    };
  }

  // 2. Increment count
  const newCount = currentCount + 1;
  const { error: updateErr } = await admin
    .from("profiles")
    .update({ badges_created: newCount, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  return { success: true, count: newCount };
}

/**
 * Fetches contributors for the leaderboard.
 */
export async function getLeaderboard(limit = 100): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "contributor")
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Leaderboard fetch error:", error);
    return [];
  }

  return (data as Profile[]) || [];
}
