import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const SOURCE = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

type Listener = (event: Record<string, unknown>) => void;

/** Runs public/sw.js against a fake `self` and returns its listeners. */
function loadServiceWorker(clientList: Record<string, unknown>[] = []) {
  const listeners: Record<string, Listener> = {};
  const self = {
    location: { origin: "https://soninho.baby" },
    addEventListener: (type: string, fn: Listener) => (listeners[type] = fn),
    registration: { showNotification: vi.fn(async () => {}) },
    clients: {
      matchAll: vi.fn(async () => clientList),
      openWindow: vi.fn(async () => ({})),
    },
  };
  new Function("self", SOURCE)(self);
  return { listeners, self };
}

async function push(payload: unknown) {
  const { listeners, self } = loadServiceWorker();
  let pending: Promise<unknown> = Promise.resolve();
  listeners.push({
    data: { json: () => payload, text: () => "" },
    waitUntil: (p: Promise<unknown>) => (pending = p),
  });
  await pending;
  return self.registration.showNotification.mock.calls[0] as unknown as [
    string,
    { requireInteraction: boolean },
  ];
}

describe("service worker", () => {
  it("keeps only OVERDUE alerts on screen", async () => {
    const [, overdue] = await push({ type: "OVERDUE", title: "a", body: "b" });
    expect(overdue.requireInteraction).toBe(true);

    const [, family] = await push({ type: "FAMILY_ACTIVITY", title: "a", body: "b" });
    expect(family.requireInteraction).toBe(false);

    const [, soon] = await push({ type: "NAP_SOON", title: "a", body: "b" });
    expect(soon.requireInteraction).toBe(false);
  });

  it("opens a new window when navigating the open one fails", async () => {
    const client = {
      url: "https://soninho.baby/app",
      focus: vi.fn(async () => client),
      navigate: vi.fn(async () => {
        throw new TypeError("not controlled");
      }),
    };
    const { listeners, self } = loadServiceWorker([client]);
    let pending: Promise<unknown> = Promise.resolve();
    listeners.notificationclick({
      notification: { close: () => {}, data: { url: "/feeding" } },
      waitUntil: (p: Promise<unknown>) => (pending = p),
    });
    await pending;
    expect(self.clients.openWindow).toHaveBeenCalledWith("/feeding");
  });
});
