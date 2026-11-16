import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient;

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
    weekly_email_enabled?: boolean;
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
