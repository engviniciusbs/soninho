import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const h = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  calls: [] as Row[],
}));

/** Thenable query over in-memory rows: select/eq/in/not(col,"is",null). */
function query(table: string) {
  const filters: ((r: Row) => boolean)[] = [];
  const rows = () => (h.tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
    in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
    // Only `.not(col, "is", null)` is used.
    not: (c: string) => (filters.push((r) => r[c] != null), q),
    then: (resolve: (v: unknown) => void) => resolve({ data: rows(), error: null }),
  };
  return q;
}

const USERS: Record<string, { email: string; name: string }> = {
  owner: { email: "owner@x.com", name: "Ana Souza" },
  carer: { email: "carer@x.com", name: "Bia" },
  viewer: { email: "viewer@x.com", name: "Caio" },
  off: { email: "off@x.com", name: "Davi" },
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (t: string) => query(t),
    auth: {
      admin: {
        getUserById: async (id: string) => ({
          data: {
            user: USERS[id]
              ? { email: USERS[id].email, user_metadata: { full_name: USERS[id].name } }
              : null,
          },
        }),
      },
    },
  }),
}));
vi.mock("@/lib/email/sleepReport", () => ({
  getResendClient: () => ({}),
  sendSleepReport: async (params: Row) => {
    h.calls.push(params);
    return { ok: true };
  },
}));

import { dispatchWeeklyEmails } from "./weekly";

const BABY = { id: "b1", name: "Lia", birth_date: "2026-02-10", avatar_emoji: null, family_id: "fam", user_id: "owner" };

beforeEach(() => {
  h.calls = [];
  h.tables = {
    babies: [BABY],
    family_members: [
      { family_id: "fam", user_id: "owner", role: "owner" },
      { family_id: "fam", user_id: "carer", role: "caregiver" },
      { family_id: "fam", user_id: "viewer", role: "viewer" },
      { family_id: "fam", user_id: "off", role: "caregiver" },
    ],
    notification_preferences: [
      { user_id: "owner", weekly_email_enabled: true, timezone: "America/Sao_Paulo" },
      { user_id: "off", weekly_email_enabled: false, timezone: "America/Sao_Paulo" },
      // carer has no preference row
    ],
  };
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-16T11:00:00Z")); // Monday, 08:00 in São Paulo
});
afterEach(() => vi.useRealTimers());

describe("dispatchWeeklyEmails", () => {
  it("sends to the family's owners and caregivers, a missing preference row counting as on", async () => {
    await dispatchWeeklyEmails();
    const to = h.calls.map((c) => c.email).sort();
    expect(to).toEqual(["carer@x.com", "owner@x.com"]);
  });

  it("gives the caregiver the family's babies", async () => {
    await dispatchWeeklyEmails();
    const carer = h.calls.find((c) => c.email === "carer@x.com")!;
    expect((carer.babies as Row[]).map((b) => b.id)).toEqual(["b1"]);
    expect(carer.parentName).toBe("Bia");
  });

  it("dedupes on the week that ended yesterday", async () => {
    await dispatchWeeklyEmails();
    const owner = h.calls.find((c) => c.email === "owner@x.com")!;
    expect(owner.dedupeKey).toBe("owner:weekly:2026-11-09");
  });
});
