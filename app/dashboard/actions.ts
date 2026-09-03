"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Retrieves the linked GitHub username for the current authenticated user
 */
export async function getProviderAccountId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("github")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.github || user.user_metadata?.user_name || user.user_metadata?.preferred_username || null;
}

/**
 * Saves the user's computed top tech stack languages to their profile
 */
export async function saveTechStack(languages: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  if (!languages || !Array.isArray(languages)) {
    return { error: "Invalid languages data" };
  }

  try {
    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("profiles")
      .update({ tech_stack: languages, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Save tech stack error:", error);
    return { error: error.message || "Failed to save tech stack" };
  }
}

/**
 * Fetches contribution graph data from GitHub for a given username
 */
export async function fetchFullActivityGraph(githubUsername: string) {
  try {
    const cleanUsername = githubUsername.replace(/^@/, "").trim();
    const res = await fetch(`https://github.com/users/${cleanUsername}/contributions`, {
      headers: {
        "User-Agent": "OSC-India-Dashboard",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch GitHub contributions (Status ${res.status}).`);
    }

    const html = await res.text();

    const countMap = new Map<string, number>();
    const regex = /data-date="([^"]+)"[^>]*id="([^"]+)"[\s\S]*?<tool-tip[^>]*for="\2"[^>]*>([^<]*)<\/tool-tip>/g;

    let match;
    while ((match = regex.exec(html)) !== null) {
      const date = match[1];
      const text = match[3];

      let count = 0;
      if (text && !text.toLowerCase().includes("no contributions")) {
        const matchCount = text.match(/^(\d+)/);
        if (matchCount) {
          count = parseInt(matchCount[1], 10);
        }
      }

      if (count > 0) {
        countMap.set(date, count);
      }
    }

    return {
      success: true,
      contributions: Array.from(countMap.entries()).map(([date, count]) => ({ date, count })),
    };
  } catch (error: any) {
    console.error("Fetch full activity error:", error);
    return { error: error.message || "Failed to fetch full activity graph" };
  }
}
