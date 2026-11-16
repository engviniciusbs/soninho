import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consumeAiQuota, tryConsumeAiQuota } from "./quota";

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
