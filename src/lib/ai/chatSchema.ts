import { z } from "zod";

export const chatRequestSchema = z.object({
  babyId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })
    )
    .min(1)
    .max(20),
});

export const CHAT_MAX_MESSAGES = 20;
export const CHAT_MAX_CONTENT = 2000;

/** Trims history to what the server accepts: last 20 messages, 2000 chars each. */
export function toChatPayload<T extends { role: "user" | "assistant"; content: string }>(
  messages: T[]
): { role: T["role"]; content: string }[] {
  return messages
    .filter((m) => m.content.length > 0)
    .slice(-CHAT_MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, CHAT_MAX_CONTENT) }));
}
