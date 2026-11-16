import type { SupabaseClient } from "@supabase/supabase-js";
import { clampEndTime } from "../sessionTime";

type Client = SupabaseClient;

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
  env?: {
    notes?: string;
    room_temp_celsius?: number | null;
    weather_condition?: string | null;
    sleep_sack_type?: string | null;
    sleep_sack_tog?: number | null;
    /** Override the start time (ISO string). Defaults to now. */
    start_time?: string;
  }
) {
  return supabase
    .from("sleep_sessions")
    .insert({
      baby_id: babyId,
      type,
      start_time: env?.start_time ?? new Date().toISOString(),
      notes: env?.notes || null,
      room_temp_celsius: env?.room_temp_celsius ?? null,
      weather_condition: env?.weather_condition ?? null,
      sleep_sack_type: env?.sleep_sack_type ?? null,
      sleep_sack_tog: env?.sleep_sack_tog ?? null,
    })
    .select()
    .single();
}

/** Minimal row used by the live poll (see classifyLiveSession). */
export async function getSleepSessionStatus(supabase: Client, sessionId: string) {
  return supabase
    .from("sleep_sessions")
    .select("id, baby_id, start_time, end_time")
    .eq("id", sessionId)
    .maybeSingle();
}

/** Environment and notes of one session (read when editing a running sleep). */
export async function getSleepSessionDetails(supabase: Client, sessionId: string) {
  return supabase
    .from("sleep_sessions")
    .select("id, notes, room_temp_celsius, weather_condition, sleep_sack_type, sleep_sack_tog")
    .eq("id", sessionId)
    .maybeSingle();
}

/**
 * Ends a session at `max(now, startTime)` so a phone whose clock is behind the
 * one that started it can still stop it (end_time >= start_time constraint).
 */
export async function endSleepSession(supabase: Client, sessionId: string, startTime: string) {
  return supabase
    .from("sleep_sessions")
    .update({ end_time: clampEndTime(startTime) })
    .eq("id", sessionId)
    // Only an open session: 0 rows (PGRST116) means someone else ended it.
    .is("end_time", null)
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
    how_fell_asleep?: string | null;
    wake_reason?: string | null;
    room_temp_celsius?: number | null;
    weather_condition?: string | null;
    sleep_sack_type?: string | null;
    sleep_sack_tog?: number | null;
    clothing_description?: string | null;
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

// ── Sleep activity log ──────────────────────────────────────────────────────

export async function getSleepActivityLog(
  supabase: Client,
  babyId: string,
  limit: number = 15
) {
  return supabase
    .from("sleep_activity_log")
    .select("*")
    .eq("baby_id", babyId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function insertSleepActivityLog(
  supabase: Client,
  row: {
    baby_id: string;
    family_id?: string | null;
    actor_user_id: string;
    actor_name?: string | null;
    actor_relation?: string | null;
    action: "started" | "stopped";
    sleep_session_id?: string | null;
    sleep_type?: "NAP" | "NIGHT_SLEEP" | null;
  }
) {
  return supabase.from("sleep_activity_log").insert(row).select().single();
}
