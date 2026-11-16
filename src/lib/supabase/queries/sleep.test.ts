import { afterEach, describe, expect, it, vi } from "vitest";
import { createRecordingSupabase } from "@/test/recordingSupabase";
import { getRecentSessions } from "@/lib/supabase/queries/sleep";

afterEach(() => vi.useRealTimers());

describe("getRecentSessions", () => {
  it("starts at local midnight of today − days − 1, so the oldest complete day is whole", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-05-24T12:00:00Z")); // 24/05 09:00 in São Paulo
    const sb = createRecordingSupabase();
    await getRecentSessions(sb.client as never, "baby-1", 7);
    const [chain] = sb.find("sleep_sessions");
    // 24 − 7 − 1 = 16/05, 00:00 local = 03:00 UTC.
    expect(chain.ops).toContainEqual(["gte", ["start_time", "2026-05-16T03:00:00.000Z"]]);
  });
});
