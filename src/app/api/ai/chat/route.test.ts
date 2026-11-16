import { beforeEach, describe, expect, it, vi } from "vitest";

const BABY = { id: "00000000-0000-4000-8000-0000000000b1", name: "Lia", birth_date: "2026-02-10" };

const h = vi.hoisted(() => ({
  consume: vi.fn(async () => true),
  create: vi.fn(),
  usedToday: null as number | null,
}));

/** Chainable, awaitable query: every filter returns itself, `single` gives the baby. */
function query(data: unknown) {
  const q: Record<string, unknown> = {
    then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
    single: async () => ({ data, error: null }),
  };
  for (const m of ["select", "eq", "gte", "lte", "order"]) q[m] = () => q;
  return q;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: () => query(BABY),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const q = {
      select: () => q,
      eq: () => q,
      maybeSingle: async () => ({
        data: h.usedToday == null ? null : { count: h.usedToday },
        error: null,
      }),
    };
    return { from: () => q };
  },
}));
vi.mock("@/lib/supabase/queries/family", () => ({ getUserRoleForBaby: async () => "owner" }));
vi.mock("@/lib/ai/quota", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/quota")>()),
  consumeAiQuota: h.consume,
}));
vi.mock("@/lib/ai/openai", () => ({
  OPENAI_MODEL: "test",
  openai: { chat: { completions: { create: h.create } } },
}));

import { POST } from "./route";

function post() {
  return POST(
    new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ babyId: BABY.id, messages: [{ role: "user", content: "Oi" }] }),
    })
  );
}

/** A finished OpenAI stream with one chunk, abortable like the SDK's. */
function fakeStream(text: string) {
  const abort = vi.fn();
  return {
    abort,
    stream: {
      controller: { abort },
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: text } }] };
      },
    },
  };
}

beforeEach(() => {
  h.consume.mockReset().mockResolvedValue(true);
  h.create.mockReset();
  h.usedToday = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/ai/chat quota", () => {
  it("does not charge the quota when OpenAI fails before the stream starts", async () => {
    h.create.mockRejectedValue(new Error("openai down"));
    const res = await post();
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(h.consume).not.toHaveBeenCalled();
  });

  it("charges the quota once the stream starts", async () => {
    h.create.mockResolvedValue(fakeStream("Olá").stream);
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Olá");
    expect(h.consume).toHaveBeenCalledOnce();
  });

  it("answers 429 and drops the stream when the daily limit is reached", async () => {
    const { stream, abort } = fakeStream("Olá");
    h.create.mockResolvedValue(stream);
    h.consume.mockResolvedValue(false);
    const res = await post();
    expect(res.status).toBe(429);
    expect(abort).toHaveBeenCalled();
  });

  it("answers 429 without calling OpenAI when today's 50 uses are spent", async () => {
    h.usedToday = 50;
    const res = await post();
    expect(res.status).toBe(429);
    expect(h.create).not.toHaveBeenCalled();
    expect(h.consume).not.toHaveBeenCalled();
  });

  it("aborts the stream when charging the quota throws", async () => {
    const { stream, abort } = fakeStream("Olá");
    h.create.mockResolvedValue(stream);
    h.consume.mockRejectedValue(new Error("rpc down"));
    const res = await post();
    expect(res.status).toBe(500);
    expect(abort).toHaveBeenCalled();
  });

  it("puts the baby's age in months in the system prompt", async () => {
    h.create.mockResolvedValue(fakeStream("Olá").stream);
    await post();
    const { messages } = h.create.mock.calls[0][0] as { messages: { content: string }[] };
    expect(messages[0].content).toMatch(/bebê de \d+ meses/);
  });
});
