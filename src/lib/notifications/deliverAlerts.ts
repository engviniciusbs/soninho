import {
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
    delete(): { in(column: "dedupe_key", values: string[]): Result };
  };
}

export type AlertOutcome = "sent" | "dead" | "failed";

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

/** sent if any device got it; dead if every device was dead; otherwise a transient failure. */
export function combineOutcomes(outcomes: SendOutcome[]): AlertOutcome {
  if (outcomes.includes("sent")) return "sent";
  if (outcomes.length > 0 && outcomes.every((o) => o === "dead")) return "dead";
  return "failed";
}

async function inChunks(keys: string[], run: (chunk: string[]) => Result, label: string) {
  for (let i = 0; i < keys.length; i += KEY_CHUNK) {
    const { error } = await run(keys.slice(i, i + KEY_CHUNK));
    if (error) console.error(`[dispatch] Failed to ${label}: ${error.message}`);
  }
}

/**
 * Sends alerts already claimed as 'pending' and settles their rows:
 * delivered → 'sent'; every subscription dead → 'failed' (kept for dedupe);
 * transient failure → claim deleted so the next tick re-claims it.
 * Returns the number of alerts delivered.
 */
export async function deliverAlerts(opts: {
  wp: Parameters<typeof sendToSubscription>[0];
  store: EventStore & SubscriptionStore;
  alerts: PlannedAlert[];
  subsByUser: Map<string, PushSubscriptionRow[]>;
  now: Date;
}): Promise<number> {
  const { wp, store, alerts, subsByUser, now } = opts;

  const jobs = alerts.flatMap((alert) => {
    const payload = JSON.stringify({
      title: alert.title,
      body: alert.body,
      icon: "/icon.svg",
      tag: alert.tag,
      url: "/",
    });
    return (subsByUser.get(alert.userId) ?? []).map((sub) => ({ key: alert.dedupeKey, sub, payload }));
  });

  const results = await mapPool(jobs, SEND_CONCURRENCY, async (job) => ({
    key: job.key,
    outcome: await sendToSubscription(wp, job.sub, job.payload, store),
  }));

  const byKey = new Map<string, SendOutcome[]>(alerts.map((a) => [a.dedupeKey, []]));
  for (const r of results) byKey.get(r.key)!.push(r.outcome);

  const groups: Record<AlertOutcome, string[]> = { sent: [], dead: [], failed: [] };
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
    groups.dead,
    (keys) =>
      store
        .from("notification_events")
        .update({ status: "failed", sent_at: null })
        .in("dedupe_key", keys),
    "mark alerts failed"
  );
  await inChunks(
    groups.failed,
    (keys) => store.from("notification_events").delete().in("dedupe_key", keys),
    "release transient claims"
  );

  return groups.sent.length;
}
