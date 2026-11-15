import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  allocateSessionToLocalDays,
  buildDailySleepTotals,
  getSessionEnd,
} from "@/lib/sleep/sessionDayAllocation";
import { makeSession } from "@/lib/sleep/__fixtures__/session";

describe("allocateSessionToLocalDays", () => {
  it("splits_night_across_midnight", () => {
    const s = makeSession({
      type: "NIGHT_SLEEP",
      start_time: "2026-05-23T21:30:00Z", // 18:30 local
      end_time: "2026-05-24T09:09:00Z", // 06:09 local
    });
    const result = allocateSessionToLocalDays(s);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      dayKey: "2026-05-23",
      nightMinutes: 330,
      napMinutes: 0,
    });
    expect(result[1]).toMatchObject({
      dayKey: "2026-05-24",
      nightMinutes: 369,
      napMinutes: 0,
    });
  });

  it("nap_single_day", () => {
    const s = makeSession({
      type: "NAP",
      start_time: "2026-05-24T13:00:00Z", // 10:00 local
      end_time: "2026-05-24T14:30:00Z", // 11:30 local
    });
    const result = allocateSessionToLocalDays(s);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      dayKey: "2026-05-24",
      napMinutes: 90,
      nightMinutes: 0,
    });
  });

  it("open_session_ignored", () => {
    expect(
      allocateSessionToLocalDays(makeSession({ end_time: null }))
    ).toEqual([]);
  });

  it("returns [] when end <= start", () => {
    const s = makeSession({
      start_time: "2026-05-24T13:00:00Z",
      end_time: "2026-05-24T13:00:00Z",
      duration_min: 0,
    });
    expect(allocateSessionToLocalDays(s)).toEqual([]);
    const reversed = makeSession({
      start_time: "2026-05-24T13:00:00Z",
      end_time: "2026-05-24T12:00:00Z",
      duration_min: 10,
    });
    expect(allocateSessionToLocalDays(reversed)).toEqual([]);
  });

  it("falls back to duration_min when end_time is missing", () => {
    const s = makeSession({
      start_time: "2026-05-24T13:00:00Z",
      end_time: null,
      duration_min: 45,
    });
    expect(getSessionEnd(s)?.toISOString()).toBe("2026-05-24T13:45:00.000Z");
    expect(allocateSessionToLocalDays(s)[0]).toMatchObject({ napMinutes: 45 });
  });

  it("dst_spring_forward_split", () => {
    // Brazil DST began 2018-11-04 00:00 local (clock jumps to 01:00), so the
    // real elapsed time is 22:00 -> 06:00 = 480 min across two local days.
    const s = makeSession({
      type: "NIGHT_SLEEP",
      start_time: "2018-11-04T00:00:00Z", // 2018-11-03 22:00 local
      end_time: "2018-11-04T08:00:00Z", // 2018-11-04 06:00 local
    });
    const result = allocateSessionToLocalDays(s);
    const total = result.reduce((a, r) => a + r.nightMinutes, 0);
    expect(result.map((r) => r.dayKey)).toEqual(["2018-11-03", "2018-11-04"]);
    expect(total).toBe(480);
  });
});

describe("buildDailySleepTotals", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-24T15:00:00Z")); // 12:00 local
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sums sessions per local day across distinct days", () => {
    const sessions = [
      makeSession({
        type: "NAP",
        start_time: "2026-05-23T13:00:00Z", // 10:00 local 23/05
        end_time: "2026-05-23T14:30:00Z", // 90 min
      }),
      makeSession({
        type: "NAP",
        start_time: "2026-05-24T13:00:00Z", // 10:00 local 24/05
        end_time: "2026-05-24T15:00:00Z", // 120 min
      }),
      makeSession({
        type: "NIGHT_SLEEP",
        start_time: "2026-05-24T01:00:00Z", // 22:00 local 23/05
        end_time: "2026-05-24T09:00:00Z", // 06:00 local 24/05
      }),
    ];
    const totals = buildDailySleepTotals(sessions, 3);
    expect(totals).toHaveLength(3);
    expect(totals[0]).toMatchObject({
      date: "22/05",
      totalHours: 0,
      napHours: 0,
      nightHours: 0,
    });
    // 23/05: nap 90 + night 22:00->00:00 = 120 -> 210 min = 3.5h
    expect(totals[1]).toMatchObject({
      date: "23/05",
      totalHours: 3.5,
      napHours: 1.5,
      nightHours: 2,
    });
    // 24/05: nap 120 + night 00:00->06:00 = 360 -> 480 min = 8h
    expect(totals[2]).toMatchObject({
      date: "24/05",
      totalHours: 8,
      napHours: 2,
      nightHours: 6,
    });
  });
});
