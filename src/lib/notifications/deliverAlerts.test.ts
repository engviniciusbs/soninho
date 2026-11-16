import { afterEach, describe, expect, it, vi } from "vitest";
import {
  alertTtlSeconds,
  combineOutcomes,
  deliverAlerts,
  mapPool,
  sweepStalePendingClaims,
} from "./deliverAlerts";
import type { PlannedAlert } from "./selectAlerts";

const NOW = new Date("2026-11-16T15:00:00Z");

type Op = {
  table: string;
  op: "update" | "delete";
  values?: unknown;
  column: string;
  arg: unknown;
  filters?: [string, string, unknown][];
};

/** Fake admin client that records every write. */
function fakeStore() {
  const ops: Op[] = [];
  const store = {
    from(table: string) {
      return {
        update(values: unknown) {
          const rec = (column: string, arg: unknown) => {
            ops.push({ table, op: "update", values, column, arg });
            return Promise.resolve({ error: null });
          };
          return { in: rec, eq: rec };
        },
        delete() {
          return {
            in(column: string, arg: unknown) {
              ops.push({ table, op: "delete", column, arg });
              return Promise.resolve({ error: null });
            },
            eq(column: string, arg: unknown) {
              return {
                lt(ltColumn: string, ltArg: unknown) {
                  ops.push({
                    table,
                    op: "delete",
                    column,
                    arg,
                    filters: [
                      ["eq", column, arg],
                      ["lt", ltColumn, ltArg],
                    ],
                  });
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
      };
    },
  };
  return { ops, store: store as never };
}

function alert(userId: string): PlannedAlert {
  return {
    userId,
    babyId: "baby-1",
    sessionId: "sess-1",
    eventType: "NAP_SOON",
    dedupeKey: `baby-1:sess-1:NAP_SOON:${userId}`,
    title: "t",
    body: "b",
    tag: "nap-soon-baby-1",
  };
}

const sub = (name: string) => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/${name}`,
  p256dh: "p",
  auth: "a",
});

/** wp whose result is decided per endpoint name. */
function fakeWp(behavior: Record<string, "ok" | 403 | 410 | 500>) {
  return {
    sendNotification: vi.fn(async ({ endpoint }: { endpoint: string }) => {
      const b = behavior[endpoint.split("/").pop()!];
      if (b === "ok") return {};
      throw { statusCode: b };
    }),
  };
}

const eventOps = (ops: Op[]) => ops.filter((o) => o.table === "notification_events");

afterEach(() => vi.restoreAllMocks());

describe("deliverAlerts", () => {
  it("marks delivered alerts as sent", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { ops, store } = fakeStore();
    const sent = await deliverAlerts({
      wp: fakeWp({ a1: "ok", a2: 500 }) as never,
      store,
      alerts: [alert("u1")],
      subsByUser: new Map([["u1", [sub("a1"), sub("a2")]]]),
      now: NOW,
    });
    expect(sent).toBe(1);
    expect(eventOps(ops)).toEqual([
      {
        table: "notification_events",
        op: "update",
        values: { status: "sent", sent_at: NOW.toISOString() },
        column: "dedupe_key",
        arg: [alert("u1").dedupeKey],
      },
    ]);
  });

  it("marks failed when every subscription is dead", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { ops, store } = fakeStore();
    const disallowed = { endpoint: "https://evil.example.com/x", p256dh: "p", auth: "a" };
    const sent = await deliverAlerts({
      wp: fakeWp({ d1: 410 }) as never,
      store,
      alerts: [alert("u1")],
      subsByUser: new Map([["u1", [sub("d1"), disallowed]]]),
      now: NOW,
    });
    expect(sent).toBe(0);
    expect(eventOps(ops)).toEqual([
      {
        table: "notification_events",
        op: "update",
        values: { status: "failed", sent_at: null },
        column: "dedupe_key",
        arg: [alert("u1").dedupeKey],
      },
    ]);
    expect(ops.filter((o) => o.table === "push_subscriptions")).toHaveLength(2);
  });

  it("deletes the claim on transient failure so the next tick retries", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { ops, store } = fakeStore();
    const sent = await deliverAlerts({
      wp: fakeWp({ t1: 500, d1: 410 }) as never,
      store,
      alerts: [alert("u1")],
      subsByUser: new Map([["u1", [sub("t1"), sub("d1")]]]),
      now: NOW,
    });
    expect(sent).toBe(0);
    expect(eventOps(ops)).toEqual([
      {
        table: "notification_events",
        op: "delete",
        column: "dedupe_key",
        arg: [alert("u1").dedupeKey],
      },
    ]);
  });

  it("settles several alerts in batched writes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { ops, store } = fakeStore();
    const sent = await deliverAlerts({
      wp: fakeWp({ a: "ok", b: "ok", c: 500 }) as never,
      store,
      alerts: [alert("u1"), alert("u2"), alert("u3")],
      subsByUser: new Map([
        ["u1", [sub("a")]],
        ["u2", [sub("b")]],
        ["u3", [sub("c")]],
      ]),
      now: NOW,
    });
    expect(sent).toBe(2);
    const ev = eventOps(ops);
    expect(ev).toHaveLength(2);
    expect(ev[0].arg).toEqual([alert("u1").dedupeKey, alert("u2").dedupeKey]);
    expect(ev[1]).toMatchObject({ op: "delete", arg: [alert("u3").dedupeKey] });
  });
});

describe("deliverAlerts payload and TTL", () => {
  it("uses the brand icon and the per-alert TTL", async () => {
    const { store } = fakeStore();
    const wp = fakeWp({ a1: "ok" });
    await deliverAlerts({
      wp: wp as never,
      store,
      alerts: [alert("u1")],
      subsByUser: new Map([["u1", [sub("a1")]]]),
      now: NOW,
      ttlFor: () => 900,
    });
    const [, payload, options] = wp.sendNotification.mock.calls[0] as unknown as [
      unknown,
      string,
      unknown,
    ];
    expect(JSON.parse(payload).icon).toBe("/brand/soninho-mark@2x.png");
    // sw.js keeps only OVERDUE on screen (requireInteraction), so it needs the type.
    expect(JSON.parse(payload).type).toBe(alert("u1").eventType);
    expect(options).toEqual({ timeout: 10_000, TTL: 900 });
  });

  it("marks a 403-only alert failed without retrying or deactivating", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { ops, store } = fakeStore();
    await deliverAlerts({
      wp: fakeWp({ r1: 403 }) as never,
      store,
      alerts: [alert("u1")],
      subsByUser: new Map([["u1", [sub("r1")]]]),
      now: NOW,
    });
    expect(ops).toEqual([
      {
        table: "notification_events",
        op: "update",
        values: { status: "failed", sent_at: null },
        column: "dedupe_key",
        arg: [alert("u1").dedupeKey],
      },
    ]);
  });
});

describe("alertTtlSeconds", () => {
  it("bounds NAP_SOON by its window (min 5 min) and keeps 1h for OVERDUE", () => {
    expect(alertTtlSeconds("NAP_SOON", 15)).toBe(900);
    expect(alertTtlSeconds("NAP_SOON", 2)).toBe(300);
    expect(alertTtlSeconds("OVERDUE", 15)).toBe(3600);
  });
});

describe("sweepStalePendingClaims", () => {
  it("deletes only pending claims older than 10 minutes", async () => {
    const { ops, store } = fakeStore();
    await sweepStalePendingClaims(store, NOW);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({
      table: "notification_events",
      op: "delete",
      filters: [
        ["eq", "status", "pending"],
        ["lt", "scheduled_for", "2026-11-16T14:50:00.000Z"],
      ],
    });
  });
});

describe("combineOutcomes", () => {
  it("prefers sent, then transient if any device may recover, else permanent", () => {
    expect(combineOutcomes(["failed", "sent"])).toBe("sent");
    expect(combineOutcomes(["dead", "dead"])).toBe("permanent");
    expect(combineOutcomes(["dead", "rejected"])).toBe("permanent");
    expect(combineOutcomes(["rejected", "failed"])).toBe("transient");
    expect(combineOutcomes(["dead", "failed"])).toBe("transient");
    expect(combineOutcomes([])).toBe("transient");
  });
});

describe("mapPool", () => {
  it("caps concurrency and preserves order", async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapPool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBe(3);
  });
});
