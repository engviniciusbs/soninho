import { describe, expect, it } from "vitest";
import type { SleepSession } from "@/types";
import { withProvisionalEnd } from "./provisional";

const open = { id: "s", start_time: "2026-01-01T10:00:00.000Z", end_time: null } as SleepSession;

describe("withProvisionalEnd", () => {
  it("counts_a_running_sleep_up_to_now", () => {
    const s = withProvisionalEnd(open, new Date("2026-01-01T10:30:00.000Z"));
    expect(s.end_time).toBe("2026-01-01T10:30:00.000Z");
    expect(s.duration_min).toBe(30);
  });

  it("accepts_a_timestamp", () => {
    expect(withProvisionalEnd(open, Date.parse("2026-01-01T11:00:00.000Z")).duration_min).toBe(60);
  });

  it("leaves_a_finished_sleep_alone", () => {
    const done = { ...open, end_time: "2026-01-01T10:10:00.000Z" } as SleepSession;
    expect(withProvisionalEnd(done, new Date("2026-01-01T12:00:00.000Z"))).toBe(done);
  });

  it("never_goes_negative_on_clock_skew", () => {
    expect(withProvisionalEnd(open, new Date("2026-01-01T09:59:00.000Z"))).toBe(open);
  });
});
