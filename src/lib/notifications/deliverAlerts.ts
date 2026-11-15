import {
  DEFAULT_PUSH_TTL_SECONDS,
  PUSH_ICON,
  sendToSubscription,
  type PushSubscriptionRow,
  type SendOutcome,
  type SubscriptionStore,
} from "@/lib/notifications/webpush";
import type { PlannedAlert } from "@/lib/notifications/selectAlerts";

type Result = PromiseLike<{ error: { message: string } | null }>;

/** Minimal Supabase surface to settle claimed notification_events rows. */
export interface EventStore {
  from(table: "notification_events"): {
    update(values: { status: "sent" | "failed"; sent_at: string | null }): {
      in(column: "dedupe_key", values: string[]): Result;
    };
    delete(): {
      in(column: "dedupe_key", values: string[]): Result;
      eq(column: "status", value: "pending"): { lt(column: "scheduled_for", value: string): Result };
    };
  };
}

/**
 * sent: delivered to at least one device → row 'sent'.
 * permanent: every device was dead or rejected (403) → row 'failed', never retried.
 * transient: some device failed transiently → claim deleted, next tick retries.
 */
export type AlertOutcome = "sent" | "permanent" | "transient";

/** Claims stuck in 'pending' longer than this (killed run) are released. */
export const PENDING_CLAIM_TTL_MS = 10 * 60 * 1000;

/**
 * Deletes 'pending' claims whose claim time (scheduled_for) is older than
 * PENDING_CLAIM_TTL_MS, so the alert can be re-claimed by this run.
 */
export async function sweepStalePendingClaims(store: EventStore, now: Date): Promise<void> {
  const cutoff = new Date(now.getTime() - PENDING_CLAIM_TTL_MS).toISOString();
  const { error } = await store
    .from("notification_events")
    .delete()
    .eq("status", "pending")
    .lt("scheduled_for", cutoff);
  if (error) console.error(`[dispatch] Failed to sweep stale claims: ${error.message}`);
}

/** Push TTL: a NAP_SOON is useless after its window (min 5 min); OVERDUE keeps 1h. */
export function alertTtlSeconds(
  eventType: PlannedAlert["eventType"],
  alertBeforeMinutes: number
): number {
  if (eventType === "NAP_SOON") return Math.max(alertBeforeMinutes * 60, 300);
  return DEFAULT_PUSH_TTL_SECONDS;
}

const SEND_CONCURRENCY = 10;
const KEY_CHUNK = 100;

/** Maps items with at most `limit` promises in flight; preserves order. */
export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** sent if any device got it; transient if any device may succeed later; else permanent. */
export function combineOutcomes(outcomes: SendOutcome[]): AlertOutcome {
  if (outcomes.includes("sent")) return "sent";
  if (outcomes.length === 0 || outcomes.includes("failed")) return "transient";
  return "permanent";
}

async function inChunks(keys: string[], run: (chunk: string[]) => Result, label: string) {
  for (let i = 0; i < keys.length; i += KEY_CHUNK) {
    const { error } = await run(keys.slice(i, i + KEY_CHUNK));
    if (error) console.error(`[dispatch] Failed to ${label}: ${error.message}`);
  }
}

/**
 * Sends alerts already claimed as 'pending' and settles their rows per
 * AlertOutcome (see above).
 * Returns the number of alerts delivered.
 */
export async function deliverAlerts(opts: {
  wp: Parameters<typeof sendToSubscription>[0];
  store: EventStore & SubscriptionStore;
  alerts: PlannedAlert[];
  subsByUser: Map<string, PushSubscriptionRow[]>;
  now: Date;
  /** Push TTL per alert; defaults to DEFAULT_PUSH_TTL_SECONDS. */
  ttlFor?: (alert: PlannedAlert) => number;
}): Promise<number> {
  const { wp, store, alerts, subsByUser, now, ttlFor } = opts;

  const jobs = alerts.flatMap((alert) => {
    const payload = JSON.stringify({
      title: alert.title,
      body: alert.body,
      icon: PUSH_ICON,
      tag: alert.tag,
      url: "/",
    });
    const ttl = ttlFor?.(alert);
    return (subsByUser.get(alert.userId) ?? []).map((sub) => ({
      key: alert.dedupeKey,
      sub,
      payload,
      ttl,
    }));
  });

  const results = await mapPool(jobs, SEND_CONCURRENCY, async (job) => ({
    key: job.key,
    outcome: await sendToSubscription(wp, job.sub, job.payload, store, { ttl: job.ttl }),
  }));

  const byKey = new Map<string, SendOutcome[]>(alerts.map((a) => [a.dedupeKey, []]));
  for (const r of results) byKey.get(r.key)!.push(r.outcome);

  const groups: Record<AlertOutcome, string[]> = { sent: [], permanent: [], transient: [] };
  for (const [key, outcomes] of byKey) groups[combineOutcomes(outcomes)].push(key);

  await inChunks(
    groups.sent,
    (keys) =>
      store
        .from("notification_events")
        .update({ status: "sent", sent_at: now.toISOString() })
        .in("dedupe_key", keys),
    "mark alerts sent"
  );
  await inChunks(
    groups.permanent,
    (keys) =>
      store
        .from("notification_events")
        .update({ status: "failed", sent_at: null })
        .in("dedupe_key", keys),
    "mark alerts failed"
  );
  await inChunks(
    groups.transient,
    (keys) => store.from("notification_events").delete().in("dedupe_key", keys),
    "release transient claims"
  );

  return groups.sent.length;
}
