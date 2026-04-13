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
  env?: {
    notes?: string;
    room_temp_celsius?: number | null;
    weather_condition?: string | null;
    sleep_sack_type?: string | null;
    sleep_sack_tog?: number | null;
  }
) {
  return supabase
    .from("sleep_sessions")
    .insert({
      baby_id: babyId,
      type,
      start_time: new Date().toISOString(),
      notes: env?.notes || null,
      room_temp_celsius: env?.room_temp_celsius ?? null,
      weather_condition: env?.weather_condition ?? null,
      sleep_sack_type: env?.sleep_sack_type ?? null,
      sleep_sack_tog: env?.sleep_sack_tog ?? null,
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

// ── Notification preferences ──

export async function getNotificationPreferences(supabase: Client, userId: string) {
  return supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function upsertNotificationPreferences(
  supabase: Client,
  userId: string,
  data: {
    enabled?: boolean;
    alert_before_minutes?: number;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
    timezone?: string;
  }
) {
  return supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

// ── Push subscriptions ──

export async function upsertPushSubscription(
  supabase: Client,
  data: {
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    user_agent?: string | null;
  }
) {
  return supabase.from("push_subscriptions").upsert(
    {
      ...data,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );
}

export async function deactivatePushSubscription(
  supabase: Client,
  userId: string,
  endpoint: string
) {
  return supabase
    .from("push_subscriptions")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
}
