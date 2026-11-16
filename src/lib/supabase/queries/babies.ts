import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient;

export async function getBabies(supabase: Client) {
  return supabase
    .from("babies")
    .select("*")
    .order("created_at", { ascending: true });
}

export async function getBaby(supabase: Client, babyId: string) {
  return supabase.from("babies").select("*").eq("id", babyId).single();
}

export async function createBaby(
  supabase: Client,
  data: { name: string; birth_date: string; avatar_emoji?: string; avatar_url?: string | null }
) {
  // family + owner membership + baby are created atomically server-side
  return supabase.rpc("create_baby_with_family", {
    p_name: data.name,
    p_birth_date: data.birth_date,
    p_avatar_emoji: data.avatar_emoji ?? "🍼",
    p_avatar_url: data.avatar_url ?? null,
  });
}

export async function updateBaby(
  supabase: Client,
  babyId: string,
  data: { name?: string; birth_date?: string; avatar_emoji?: string; avatar_url?: string | null }
) {
  return supabase.from("babies").update(data).eq("id", babyId).select().single();
}

export async function deleteBaby(supabase: Client, babyId: string) {
  return supabase.from("babies").delete().eq("id", babyId);
}
