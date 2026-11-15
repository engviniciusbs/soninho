import { describe, it, expect, vi } from "vitest";
import { sendSleepReport } from "./sleepReport";

function fakeSupabase(inserted: boolean) {
  const deleted: string[] = [];
  const empty = {
    select: () => ({ eq: () => ({ gte: () => ({ order: async () => ({ data: [] }) , then: (r: (v: unknown) => void) => r({ data: [] }) }), then: (r: (v: unknown) => void) => r({ data: [] }) }) }),
  };
  const sb = {
    from: (t: string) =>
      t === "email_log"
        ? {
            upsert: () => ({
              select: async () => ({ data: inserted ? [{ id: 1 }] : [], error: null }),
            }),
            delete: () => ({
              eq: async (_c: string, v: string) => {
                deleted.push(v);
                return { error: null };
              },
            }),
          }
        : empty,
  };
  return { sb: sb as never, deleted };
}

const base = {
  userId: "u",
  email: "e@x.com",
  parentName: "",
  periodDays: 7,
  kind: "manual" as const,
  dedupeKey: "k",
  babies: [],
};

describe("sendSleepReport claim", () => {
  it("returns deduped when claim not inserted", async () => {
    const { sb } = fakeSupabase(false);
    const send = vi.fn();
    const r = await sendSleepReport({ ...base, supabase: sb, resend: { emails: { send } } as never });
    expect(r).toEqual({ ok: false, reason: "deduped" });
    expect(send).not.toHaveBeenCalled();
  });

  it("releases claim when there is no data", async () => {
    const { sb, deleted } = fakeSupabase(true);
    const r = await sendSleepReport({ ...base, supabase: sb, resend: { emails: { send: vi.fn() } } as never });
    expect(r).toEqual({ ok: false, reason: "no_data" });
    expect(deleted).toEqual(["k"]);
  });
});
