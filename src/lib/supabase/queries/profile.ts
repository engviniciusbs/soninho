import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient;

// ── User profiles ───────────────────────────────────────────────────────────

export async function getUserProfile(supabase: Client, userId: string) {
  return supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function upsertUserProfile(
  supabase: Client,
  userId: string,
  patch: {
    display_name?: string | null;
    family_relation?: string | null;
    ui_mode?: "standard" | "nanny";
  }
) {
  return supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: userId,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();
}
