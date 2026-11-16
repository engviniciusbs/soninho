import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const baby = { id: "00000000-0000-4000-8000-0000000000b1", birth_date: "2026-02-09" };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: baby, error: null }) }) }),
    }),
  }),
}));
vi.mock("@/lib/supabase/queries/family", () => ({ getUserRoleForBaby: async () => "owner" }));
vi.mock("@/lib/supabase/queries/sleep", () => ({ getRecentSessions: async () => ({ data: [] }) }));
vi.mock("@/lib/ai/quota", () => ({ tryConsumeAiQuota: async () => false }));
vi.mock("@/lib/ai/openai", () => ({ openai: {}, OPENAI_MODEL: "test" }));
vi.mock("@/lib/sleep/regression", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sleep/regression")>();
  return {
    ...actual,
    detectRegression: vi.fn(actual.detectRegression),
    computeSleepDebt: vi.fn(actual.computeSleepDebt),
  };
});

import { POST } from "@/app/api/ai/regression/route";
import { computeSleepDebt, detectRegression } from "@/lib/sleep/regression";

const NOW = new Date("2026-11-17T01:30:00Z"); // 16/11 22:30 in São Paulo

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/ai/regression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.mocked(detectRegression).mockClear();
  vi.mocked(computeSleepDebt).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/ai/regression", () => {
  it("measures days in the timezone sent in the body", async () => {
    const res = await post({ babyId: baby.id, timezone: "Asia/Tokyo", withAi: false });
    expect(res.status).toBe(200);
    expect(vi.mocked(detectRegression).mock.calls[0][3]).toMatchObject({ timeZone: "Asia/Tokyo" });
    expect(vi.mocked(computeSleepDebt).mock.calls[0][3]).toMatchObject({ timeZone: "Asia/Tokyo" });
  });

  it("defaults to America/Sao_Paulo when no timezone is sent", async () => {
    await post({ babyId: baby.id, withAi: false });
    expect(vi.mocked(detectRegression).mock.calls[0][3]).toMatchObject({
      timeZone: "America/Sao_Paulo",
    });
  });

  it("rejects an invalid timezone", async () => {
    const res = await post({ babyId: baby.id, timezone: "Mars/Olympus", withAi: false });
    expect(res.status).toBe(400);
  });
});
