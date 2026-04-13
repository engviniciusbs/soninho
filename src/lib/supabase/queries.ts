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
  data: { user_id: string; name: string; birth_date: string; avatar_emoji?: string; avatar_url?: string | null }
) {
  return supabase.from("babies").insert(data).select().single();
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

export async function getSleepSessions(
  supabase: Client,
  babyId: string,
  from: Date,
  to: Date
) {
  return supabase
    .from("sleep_sessions")
    .select("*")
    .eq("baby_id", babyId)
    .gte("start_time", from.toISOString())
    .lte("start_time", to.toISOString())
    .order("start_time", { ascending: false });
}

export async function getLastSleepSession(supabase: Client, babyId: string) {
  return supabase
    .from("sleep_sessions")
    .select("*")
    .eq("baby_id", babyId)
    .not("end_time", "is", null)
    .order("end_time", { ascending: false })
    .limit(1)
    .single();
}

export async function getActiveSleepSession(supabase: Client, babyId: string) {
  return supabase
    .from("sleep_sessions")
    .select("*")
    .eq("baby_id", babyId)
    .is("end_time", null)
    .maybeSingle();
}

export async function startSleepSession(
  supabase: Client,
  babyId: string,
  type: "NAP" | "NIGHT_SLEEP",
  notes?: string
) {
  return supabase
    .from("sleep_sessions")
    .insert({
      baby_id: babyId,
      type,
      start_time: new Date().toISOString(),
      notes: notes || null,
    })
    .select()
    .single();
}

export async function endSleepSession(supabase: Client, sessionId: string) {
  return supabase
    .from("sleep_sessions")
    .update({ end_time: new Date().toISOString() })
    .eq("id", sessionId)
    .select()
    .single();
}

export async function updateSleepSession(
  supabase: Client,
  sessionId: string,
  data: {
    type?: "NAP" | "NIGHT_SLEEP";
    start_time?: string;
    end_time?: string | null;
    quality?: number | null;
    notes?: string | null;
    location?: string | null;
  }
) {
  return supabase
    .from("sleep_sessions")
    .update(data)
    .eq("id", sessionId)
    .select()
    .single();
}

export async function deleteSleepSession(supabase: Client, sessionId: string) {
  return supabase.from("sleep_sessions").delete().eq("id", sessionId);
}

export async function getRecentSessions(
  supabase: Client,
  babyId: string,
  days: number = 7
) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  return getSleepSessions(supabase, babyId, from, new Date());
}
