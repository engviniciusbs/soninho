import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const db = vi.hoisted(() => ({ tables: {} as Record<string, Row[]> }));

/** In-memory upsert honoring onConflict + ignoreDuplicates, like PostgREST. */
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: (table: string) => ({
      upsert: async (
        row: Row,
        opts: { onConflict: string; ignoreDuplicates?: boolean }
      ) => {
        const rows = (db.tables[table] ??= []);
        const existing = rows.find((r) => r[opts.onConflict] === row[opts.onConflict]);
        if (!existing) rows.push({ ...row });
        else if (!opts.ignoreDuplicates) Object.assign(existing, row);
        return { error: null };
      },
    }),
  }),
}));

import { POST } from "./route";

function subscribe() {
  return POST(
    new Request("http://localhost/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "https://fcm.googleapis.com/fcm/send/abc",
        p256dh: "key",
        auth: "auth",
      }),
    }) as never
  );
}

beforeEach(() => {
  db.tables = {};
});

describe("POST /api/notifications/subscribe", () => {
  it("keeps alerts turned off: an existing enabled=false preference stays false", async () => {
    db.tables.notification_preferences = [{ user_id: "u1", enabled: false }];
    const res = await subscribe();
    expect(res.status).toBe(200);
    expect(db.tables.notification_preferences).toEqual([{ user_id: "u1", enabled: false }]);
  });

  it("creates the default preference row when none exists", async () => {
    await subscribe();
    expect(db.tables.notification_preferences).toEqual([{ user_id: "u1", enabled: true }]);
  });
});
