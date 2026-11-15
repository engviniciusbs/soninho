import * as webpush from "web-push";
import { isAllowedPushEndpoint } from "@/lib/notifications/pushEndpoint";

export const PUSH_ICON = "/brand/soninho-mark@2x.png";

type WebPush = typeof import("web-push");

let state: { instance: WebPush | null } | null = null;

/** Configures VAPID once (lazily); returns null (single warning) if env is incomplete. */
export function getWebPush(): WebPush | null {
  if (state) return state.instance;

  const contact = process.env.VAPID_CONTACT_EMAIL;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!contact || !publicKey || !privateKey) {
    console.warn("[push] VAPID env vars missing; push notifications disabled");
    state = { instance: null };
    return null;
  }

  try {
    webpush.setVapidDetails(contact, publicKey, privateKey);
  } catch {
    console.warn("[push] Invalid VAPID configuration; push notifications disabled");
    state = { instance: null };
    return null;
  }
  state = { instance: webpush };
  return webpush;
}

function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "invalid-endpoint";
  }
}

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Minimal Supabase surface needed to deactivate a subscription. */
export interface SubscriptionStore {
  from(table: "push_subscriptions"): {
    update(values: { is_active: boolean }): {
      eq(column: "endpoint", value: string): PromiseLike<unknown>;
    };
  };
}

/**
 * Outcome of one push: delivered, subscription dead (deactivated), or a
 * transient failure worth retrying later.
 * - "sent": delivered.
 * - "dead": subscription is permanently unusable and was deactivated
 *   (disallowed host, 404/410 gone, 400 malformed, 413 payload too large).
 * - "rejected": 403 — usually a VAPID key mismatch (e.g. after key rotation),
 *   which would hit every subscription at once, so it is NOT deactivated; the
 *   current alert should not be retried either.
 * - "failed": transient (timeout, network, 5xx, 429, ...) — retry later.
 */
export type SendOutcome = "sent" | "dead" | "rejected" | "failed";

/** web-push has no default timeout; keep well under the route's maxDuration. */
export const PUSH_TIMEOUT_MS = 10_000;
export const DEFAULT_PUSH_TTL_SECONDS = 3600;

const DEAD_STATUS = new Set([400, 404, 410, 413]);

/**
 * Sends one push. Endpoints outside the allowlist are never contacted and the
 * row is deactivated. See SendOutcome for how errors are classified.
 */
export async function sendToSubscription(
  wp: Pick<WebPush, "sendNotification">,
  sub: PushSubscriptionRow,
  payload: string,
  store: SubscriptionStore,
  options: { ttl?: number } = {}
): Promise<SendOutcome> {
  const deactivate = async () => {
    await store
      .from("push_subscriptions")
      .update({ is_active: false })
      .eq("endpoint", sub.endpoint);
  };

  if (!isAllowedPushEndpoint(sub.endpoint)) {
    console.warn(`[push] Disallowed endpoint host ${endpointHost(sub.endpoint)}; deactivating`);
    await deactivate();
    return "dead";
  }

  try {
    await wp.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
      { timeout: PUSH_TIMEOUT_MS, TTL: options.ttl ?? DEFAULT_PUSH_TTL_SECONDS }
    );
    return "sent";
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    console.error(
      `[push] Send failed for ${endpointHost(sub.endpoint)} (status ${statusCode ?? "n/a"})`
    );
    if (statusCode !== undefined && DEAD_STATUS.has(statusCode)) {
      await deactivate();
      return "dead";
    }
    if (statusCode === 403) return "rejected";
    return "failed";
  }
}
