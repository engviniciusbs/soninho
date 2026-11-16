import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const h = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  sent: [] as { user: unknown; payload: string }[],
}));

/** Thenable query over in-memory rows: select/eq/neq/in, single/maybeSingle. */
function query(table: string) {
  const filters: ((r: Row) => boolean)[] = [];
  const rows = () => (h.tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
    neq: (c: string, v: unknown) => (filters.push((r) => r[c] !== v), q),
    in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
    single: async () => ({ data: rows()[0] ?? null, error: null }),
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    then: (resolve: (v: unknown) => void) => resolve({ data: rows(), error: null }),
  };
  return q;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (t: string) => query(t) }),
}));
vi.mock("@/lib/notifications/webpush", () => ({
  PUSH_ICON: "/icon.png",
  getWebPush: () => ({}),
  sendToSubscription: async (_wp: unknown, sub: Row, payload: string) => {
    h.sent.push({ user: sub.user_id, payload });
    return "sent";
  },
}));

import { notifyFamilyFeedingActivity, notifyFamilySleepActivity } from "./familyActivity";

const BABY = "baby-1";

function seed(prefs: Row[]) {
  h.tables = {
    babies: [{ id: BABY, family_id: "fam-1", user_id: "actor" }],
    family_members: [
      { family_id: "fam-1", user_id: "actor" },
      { family_id: "fam-1", user_id: "mom" },
    ],
    notification_preferences: prefs,
    push_subscriptions: [{ id: "s1", user_id: "mom", is_active: true }],
  };
}

const sleepParams = {
  babyId: BABY,
  actorUserId: "actor",
  action: "started" as const,
  sleepType: "NAP" as const,
  babyName: "Lia",
  actorName: "Ana",
  actorRelation: null,
};

beforeEach(() => {
  h.sent = [];
  vi.stubEnv("VAPID_PRIVATE_KEY", "x");
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "y");
  vi.useFakeTimers({ toFake: ["Date"] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("family activity push", () => {
  it("is not sent to a recipient inside their quiet hours", async () => {
    vi.setSystemTime(new Date("2026-11-17T01:30:00Z")); // 22:30 in São Paulo
    seed([
      {
        user_id: "mom",
        enabled: true,
        quiet_hours_start: "22:00",
        quiet_hours_end: "07:00",
        timezone: "America/Sao_Paulo",
      },
    ]);
    expect(await notifyFamilySleepActivity(sleepParams)).toBe(0);
    expect(h.sent).toEqual([]);
  });

  it("uses the default quiet hours (22:00 to 07:00) when the recipient has no preference row", async () => {
    vi.setSystemTime(new Date("2026-11-17T01:30:00Z"));
    seed([]);
    expect(await notifyFamilySleepActivity(sleepParams)).toBe(0);
  });

  it("is sent outside quiet hours, with plain text and a non-OVERDUE type", async () => {
    vi.setSystemTime(new Date("2026-11-16T15:00:00Z")); // 12:00 in São Paulo
    seed([
      {
        user_id: "mom",
        enabled: true,
        quiet_hours_start: "22:00",
        quiet_hours_end: "07:00",
        timezone: "America/Sao_Paulo",
      },
    ]);
    expect(await notifyFamilyFeedingActivity({ ...sleepParams, action: "logged", feedingType: "BOTTLE" })).toBe(1);
    const payload = JSON.parse(h.sent[0].payload);
    expect(payload.type).toBe("FAMILY_ACTIVITY");
    expect(payload.body).toBe("Ana registrou mamadeira de Lia");
  });

  it("skips a recipient who turned alerts off", async () => {
    vi.setSystemTime(new Date("2026-11-16T15:00:00Z"));
    seed([{ user_id: "mom", enabled: false }]);
    expect(await notifyFamilySleepActivity(sleepParams)).toBe(0);
  });
});
