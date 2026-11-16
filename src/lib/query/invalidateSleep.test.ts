import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { invalidateSleepQueries } from "./invalidateSleep";

// The keys as the hooks build them (useWakeWindow, useAISuggestions,
// useRegression, TodayCard, history, analytics).
const keysOf = (babyId: string) => [
  ["sleep-sessions", "home-recent", babyId],
  ["sleep-sessions", babyId, "day", "2026-01-01"],
  ["last-session", babyId],
  ["last-session-key", babyId],
  ["ai-suggestion", babyId, "v3", "s-1:2026-01-01T12:00:00.000Z"],
  ["regression", babyId, "s-1:2026-01-01T12:00:00.000Z", "2026-01-01"],
];

describe("invalidateSleepQueries", () => {
  it("marks every sleep-derived query of the baby stale", async () => {
    const qc = new QueryClient();
    for (const key of [...keysOf("baby-1"), ...keysOf("baby-2"), ["feeding-timeline", "baby-1"]]) {
      qc.setQueryData(key, { cached: true });
    }

    await invalidateSleepQueries(qc, "baby-1");

    const stale = (key: unknown[]) => qc.getQueryState(key)?.isInvalidated;
    for (const key of keysOf("baby-1")) expect(stale(key), JSON.stringify(key)).toBe(true);
    // Other babies keep their suggestion, regression and wake window...
    for (const key of keysOf("baby-2").filter((k) => k[0] !== "sleep-sessions")) {
      expect(stale(key), JSON.stringify(key)).toBe(false);
    }
    // ...and unrelated data is untouched.
    expect(stale(["feeding-timeline", "baby-1"])).toBe(false);
  });
});
