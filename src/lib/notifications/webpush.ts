import * as webpush from "web-push";

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

  webpush.setVapidDetails(contact, publicKey, privateKey);
  state = { instance: webpush };
  return webpush;
}
