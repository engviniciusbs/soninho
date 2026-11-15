import { deliverAlerts } from "@/lib/notifications/deliverAlerts";
import { getWebPush, type PushSubscriptionRow } from "@/lib/notifications/webpush";
import { selectAlerts, type AlertPref, type SelectAlertsInput } from "@/lib/notifications/selectAlerts";
import { createAdminClient } from "@/lib/supabase/admin";

/** Completed sessions older than this are not considered (wake windows max out at 4h). */
const LAST_SESSION_LOOKBACK_MS = 24 * 60 * 60 * 1000;
/** Keeps `in (...)` lists well under PostgREST URL limits. */
const IN_CHUNK = 100;

function chunks<T>(items: T[], size = IN_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Runs one query per chunk of ids (a single query for typical sizes) and concatenates rows. */
async function selectIn<T>(
  ids: string[],
  run: (chunk: string[]) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  if (ids.length === 0) return [];
  const results = await Promise.all(chunks(ids).map((c) => run(c)));
  return results.flatMap(({ data, error }) => {
    if (error) throw new Error(error.message);
    return data ?? [];
  });
}

const uniq = (xs: string[]) => [...new Set(xs)];

export async function dispatchNotifications(now: Date = new Date()): Promise<number> {
  const supabase = createAdminClient();

  // 1. Users with notifications enabled.
  const { data: prefRows, error: prefError } = await supabase
    .from("notification_preferences")
    .select("user_id, enabled, alert_before_minutes, quiet_hours_start, quiet_hours_end, timezone")
    .eq("enabled", true);
  if (prefError) throw new Error(prefError.message);
  const prefs = (prefRows ?? []) as AlertPref[];
  if (prefs.length === 0) return 0;

  // 2. Their owner/caregiver memberships.
  const members = await selectIn<SelectAlertsInput["members"][number]>(
    uniq(prefs.map((p) => p.user_id)),
    (ids) =>
      supabase
        .from("family_members")
        .select("family_id, user_id, role")
        .in("user_id", ids)
        .in("role", ["owner", "caregiver"])
  );
  if (members.length === 0) return 0;

  // 3. Babies of those families.
  const babies = await selectIn<SelectAlertsInput["babies"][number]>(
    uniq(members.map((m) => m.family_id)),
    (ids) => supabase.from("babies").select("id, family_id, birth_date, name").in("family_id", ids)
  );
  if (babies.length === 0) return 0;
  const babyIds = babies.map((b) => b.id);
  const since = new Date(now.getTime() - LAST_SESSION_LOOKBACK_MS).toISOString();

  // 4–6. Recent completed sessions, open sessions and recipients' subscriptions, in parallel.
  const [ended, open, subs] = await Promise.all([
    selectIn<{ id: string; baby_id: string; end_time: string }>(babyIds, (ids) =>
      supabase
        .from("sleep_sessions")
        .select("id, baby_id, end_time")
        .in("baby_id", ids)
        .not("end_time", "is", null)
        .gte("end_time", since)
        .order("end_time", { ascending: false })
    ),
    selectIn<{ baby_id: string }>(babyIds, (ids) =>
      supabase.from("sleep_sessions").select("baby_id").in("baby_id", ids).is("end_time", null)
    ),
    selectIn<PushSubscriptionRow & { user_id: string }>(
      uniq(members.map((m) => m.user_id)),
      (ids) =>
        supabase
          .from("push_subscriptions")
          .select("user_id, endpoint, p256dh, auth")
          .in("user_id", ids)
          .eq("is_active", true)
    ),
  ]);

  const lastEnded: SelectAlertsInput["lastEnded"] = {};
  for (const s of ended) {
    const current = lastEnded[s.baby_id];
    if (!current || Date.parse(s.end_time) > Date.parse(current.endTime)) {
      lastEnded[s.baby_id] = { sessionId: s.id, endTime: s.end_time };
    }
  }

  const subsByUser = new Map<string, PushSubscriptionRow[]>();
  for (const { user_id, ...sub } of subs) {
    const list = subsByUser.get(user_id) ?? [];
    list.push(sub);
    subsByUser.set(user_id, list);
  }

  // Only users with a device to receive the push claim an alert.
  const alerts = selectAlerts({
    now,
    prefs,
    members,
    babies,
    lastEnded,
    activeBabyIds: new Set(open.map((s) => s.baby_id)),
  }).filter((a) => subsByUser.has(a.userId));
  if (alerts.length === 0) return 0;

  const webpush = getWebPush();
  if (!webpush) return 0;

  // 7. Claim alerts atomically as 'pending': rows that already existed are not returned.
  const { data: claimed, error: claimError } = await supabase
    .from("notification_events")
    .upsert(
      alerts.map((a) => ({
        user_id: a.userId,
        baby_id: a.babyId,
        session_id: a.sessionId,
        event_type: a.eventType,
        dedupe_key: a.dedupeKey,
        sent_at: null,
        status: "pending",
      })),
      { onConflict: "dedupe_key", ignoreDuplicates: true }
    )
    .select("dedupe_key");
  if (claimError) throw new Error(claimError.message);

  const claimedKeys = new Set((claimed ?? []).map((r) => r.dedupe_key as string));
  const owned = alerts.filter((a) => claimedKeys.has(a.dedupeKey));
  if (owned.length === 0) return 0;

  // 8. Send (bounded concurrency, per-send timeout) and settle each claim.
  return deliverAlerts({ wp: webpush, store: supabase, alerts: owned, subsByUser, now });
}
