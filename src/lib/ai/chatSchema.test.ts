import { describe, it, expect } from "vitest";
import { chatRequestSchema, toChatPayload } from "./chatSchema";

const babyId = "11111111-1111-4111-8111-111111111111";
const msg = (content = "oi", role = "user") => ({ role, content });

describe("chatRequestSchema", () => {
  it("accepts a valid request", () => {
    expect(chatRequestSchema.safeParse({ babyId, messages: [msg()] }).success).toBe(true);
  });
  it("rejects more than 20 messages", () => {
    const messages = Array.from({ length: 21 }, () => msg());
    expect(chatRequestSchema.safeParse({ babyId, messages }).success).toBe(false);
  });
  it("rejects empty messages array", () => {
    expect(chatRequestSchema.safeParse({ babyId, messages: [] }).success).toBe(false);
  });
  it("rejects content over 2000 chars", () => {
    expect(
      chatRequestSchema.safeParse({ babyId, messages: [msg("a".repeat(2001))] }).success
    ).toBe(false);
  });
  it("rejects role system", () => {
    expect(
      chatRequestSchema.safeParse({ babyId, messages: [msg("x", "system")] }).success
    ).toBe(false);
  });
});

describe("toChatPayload", () => {
  it("keeps the last 20 messages and truncates long content", () => {
    const messages = Array.from({ length: 25 }, (_, i) => ({
      role: (i % 2 ? "assistant" : "user") as "user" | "assistant",
      content: i === 24 ? "x".repeat(5000) : `m${i}`,
    }));
    const out = toChatPayload(messages);
    expect(out).toHaveLength(20);
    expect(out[0].content).toBe("m5");
    expect(out[19].content).toHaveLength(2000);
    expect(chatRequestSchema.safeParse({ babyId, messages: out }).success).toBe(true);
  });
});
