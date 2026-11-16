import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consumeAiQuota, isAiQuotaExhausted, tryConsumeAiQuota } from "./quota";

const client = (res: { data: unknown; error: unknown }) =>
  ({ rpc: vi.fn(async () => res) }) as unknown as SupabaseClient;

describe("tryConsumeAiQuota", () => {
  it("passes through true and false", async () => {
    expect(await tryConsumeAiQuota(client({ data: true, error: null }))).toBe(true);
    expect(await tryConsumeAiQuota(client({ data: false, error: null }))).toBe(false);
  });
  it("returns false instead of throwing on an RPC error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const c = client({ data: null, error: new Error("rpc down") });
    await expect(consumeAiQuota(c)).rejects.toThrow("rpc down");
    expect(await tryConsumeAiQuota(c)).toBe(false);
  });
});

describe("isAiQuotaExhausted", () => {
  type Filters = Record<string, unknown>;
  function admin(res: { data: unknown; error: unknown }) {
    const filters: Filters = {};
    const q = {
      select: () => q,
      eq: (c: string, v: unknown) => ((filters[c] = v), q),
      maybeSingle: async () => res,
    };
    return { client: { from: vi.fn(() => q) } as unknown as SupabaseClient, filters };
  }
  // 22:30 of 16/11 in São Paulo; the RPC counts by the São Paulo day.
  const NOW = new Date("2026-11-17T01:30:00Z");

  it("reads today's São Paulo count for the user", async () => {
    const { client, filters } = admin({ data: { count: 50 }, error: null });
    expect(await isAiQuotaExhausted(client, "u1", NOW)).toBe(true);
    expect(filters).toEqual({ user_id: "u1", day: "2026-11-16" });
  });

  it("is false below the limit or with no row yet", async () => {
    expect(await isAiQuotaExhausted(admin({ data: { count: 49 }, error: null }).client, "u1", NOW)).toBe(false);
    expect(await isAiQuotaExhausted(admin({ data: null, error: null }).client, "u1", NOW)).toBe(false);
  });

  it("throws on a read error", async () => {
    const { client } = admin({ data: null, error: new Error("db down") });
    await expect(isAiQuotaExhausted(client, "u1", NOW)).rejects.toThrow("db down");
  });
});
