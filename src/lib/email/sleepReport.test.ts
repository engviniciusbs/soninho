import { describe, it, expect, vi } from "vitest";
import { sendSleepReport } from "./sleepReport";

/** Chainable, awaitable query builder that resolves to `{ data }` at any point. */
function query(data: unknown[]) {
  const q: Record<string, unknown> = {
    then: (resolve: (v: unknown) => void) => resolve({ data }),
  };
  for (const m of ["select", "eq", "gte", "order"]) q[m] = () => q;
  return q;
}

const SESSION = {
  id: "s1",
  baby_id: "b1",
  type: "NAP",
  start_time: new Date(Date.now() - 3_600_000).toISOString(),
  end_time: new Date().toISOString(),
  duration_min: 60,
};

function fakeSupabase(opts: { inserted: boolean; withData?: boolean }) {
  const deleted: string[] = [];
  const supabase = {
    from: (table: string) => {
      if (table === "email_log") {
        return {
          upsert: () => ({
            select: async () => ({
              data: opts.inserted ? [{ id: 1 }] : [],
              error: null,
            }),
          }),
          delete: () => ({
            eq: async (_col: string, value: string) => {
              deleted.push(value);
              return { error: null };
            },
          }),
        };
      }
      return query(
        table === "sleep_sessions" && opts.withData ? [SESSION] : []
      );
    },
  };
  return { supabase: supabase as never, deleted };
}

const base = {
  userId: "u",
  email: "e@x.com",
  parentName: "",
  periodDays: 7,
  kind: "manual" as const,
  dedupeKey: "k",
  babies: [
    { id: "b1", name: "Bebe", birth_date: "2026-01-01", avatar_emoji: null },
  ],
};

const resendWith = (send: unknown) => ({ emails: { send } }) as never;

describe("sendSleepReport claim", () => {
  it("returns deduped when claim not inserted", async () => {
    const { supabase } = fakeSupabase({ inserted: false });
    const send = vi.fn();
    const r = await sendSleepReport({ ...base, supabase, resend: resendWith(send) });
    expect(r).toEqual({ ok: false, reason: "deduped" });
    expect(send).not.toHaveBeenCalled();
  });

  it("releases claim when there is no data", async () => {
    const { supabase, deleted } = fakeSupabase({ inserted: true });
    const r = await sendSleepReport({ ...base, supabase, resend: resendWith(vi.fn()) });
    expect(r).toEqual({ ok: false, reason: "no_data" });
    expect(deleted).toEqual(["k"]);
  });

  it("releases claim when Resend returns an error", async () => {
    const { supabase, deleted } = fakeSupabase({ inserted: true, withData: true });
    const send = vi.fn().mockResolvedValue({ error: { message: "boom" } });
    const r = await sendSleepReport({ ...base, supabase, resend: resendWith(send) });
    expect(send).toHaveBeenCalledOnce();
    expect(r).toEqual({ ok: false, reason: "send_failed" });
    expect(deleted).toEqual(["k"]);
  });

  it("releases claim and propagates when Resend throws", async () => {
    const { supabase, deleted } = fakeSupabase({ inserted: true, withData: true });
    const send = vi.fn().mockRejectedValue(new Error("network"));
    await expect(
      sendSleepReport({ ...base, supabase, resend: resendWith(send) })
    ).rejects.toThrow("network");
    expect(deleted).toEqual(["k"]);
  });

  it("keeps the claim on success", async () => {
    const { supabase, deleted } = fakeSupabase({ inserted: true, withData: true });
    const send = vi.fn().mockResolvedValue({ error: null });
    const r = await sendSleepReport({ ...base, supabase, resend: resendWith(send) });
    expect(r).toEqual({ ok: true });
    expect(deleted).toEqual([]);
  });
});
