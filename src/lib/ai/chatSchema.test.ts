import { describe, it, expect } from "vitest";
import { chatRequestSchema } from "./chatSchema";

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
