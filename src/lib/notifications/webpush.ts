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
 * transient failure (timeout, 5xx, network) worth retrying later.
 */
export type SendOutcome = "sent" | "dead" | "failed";

/** web-push has no default timeout; keep well under the route's maxDuration. */
export const PUSH_SEND_OPTIONS = { timeout: 10_000, TTL: 3600 } as const;

/**
 * Sends one push. Endpoints outside the allowlist are never contacted and the
 * row is deactivated ("dead"); 404/410 deactivate ("dead"); other errors are
 * only logged ("failed").
 */
export async function sendToSubscription(
  wp: Pick<WebPush, "sendNotification">,
  sub: PushSubscriptionRow,
  payload: string,
  store: SubscriptionStore
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
      PUSH_SEND_OPTIONS
    );
    return "sent";
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    const dead = statusCode === 404 || statusCode === 410;
    if (dead) await deactivate();
    console.error(
      `[push] Send failed for ${endpointHost(sub.endpoint)} (status ${statusCode ?? "n/a"})`
    );
    return dead ? "dead" : "failed";
  }
}
