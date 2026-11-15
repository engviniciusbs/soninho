import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDailyTotals,
  getLast24hStats,
  getLongestNightStretch,
  getNapCountPerDay,
  getNapPatternHeatmap,
  getOverallStats,
} from "@/lib/sleep/statistics";
import { makeSession } from "@/lib/sleep/__fixtures__/session";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-24T12:00:00Z")); // 09:00 local
});
afterEach(() => {
  vi.useRealTimers();
});

// 10:00-11:00 local on 24/05
const nap24 = makeSession({
  type: "NAP",
  start_time: "2026-05-24T13:00:00Z",
  end_time: "2026-05-24T14:00:00Z",
});
// 13:00-15:00 local on 23/05 (two naps that day below)
const nap23a = makeSession({
  type: "NAP",
  start_time: "2026-05-23T16:00:00Z",
  end_time: "2026-05-23T17:00:00Z",
});
const nap23b = makeSession({
  type: "NAP",
  start_time: "2026-05-23T19:00:00Z",
  end_time: "2026-05-23T19:30:00Z",
});

describe("getDailyTotals", () => {
  it("delegates to per-day allocation", () => {
    const r = getDailyTotals([nap23a, nap23b, nap24], 2);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ date: "23/05", napHours: 1.5, totalHours: 1.5 });
    expect(r[1]).toMatchObject({ date: "24/05", napHours: 1, totalHours: 1 });
  });
});

describe("getNapCountPerDay", () => {
  it("counts naps per local day, ignoring night sleep and open naps", () => {
    const night = makeSession({
      type: "NIGHT_SLEEP",
      start_time: "2026-05-23T23:00:00Z",
      end_time: "2026-05-24T08:00:00Z",
    });
    const open = makeSession({ type: "NAP", start_time: "2026-05-24T13:00:00Z" });
    const r = getNapCountPerDay([nap23a, nap23b, nap24, night, open], 3);
    expect(r).toEqual([
      { date: "22/05", count: 0 },
      { date: "23/05", count: 2 },
      { date: "24/05", count: 1 },
    ]);
  });
});

describe("getLongestNightStretch", () => {
  it("returns the longest night allocation per day", () => {
    const shortNight = makeSession({
      type: "NIGHT_SLEEP",
      start_time: "2026-05-24T09:00:00Z", // 06:00 local 24/05
      end_time: "2026-05-24T10:00:00Z", // 07:00 -> 60 min
    });
    const longNight = makeSession({
      type: "NIGHT_SLEEP",
      start_time: "2026-05-24T03:00:00Z", // 00:00 local 24/05
      end_time: "2026-05-24T08:00:00Z", // 05:00 -> 300 min
    });
    const r = getLongestNightStretch([shortNight, longNight, nap24], 2);
    expect(r).toEqual([
      { date: "23/05", hours: 0 },
      { date: "24/05", hours: 5 },
    ]);
  });
});

describe("getNapPatternHeatmap", () => {
  it("buckets naps by local weekday and hour", () => {
    // 2026-05-24 is a Sunday (0); 13:00Z = 10:00 local.
    const second = makeSession({
      type: "NAP",
      start_time: "2026-05-24T13:40:00Z", // 10:40 local, same bucket
      end_time: "2026-05-24T14:00:00Z",
    });
    // 2026-05-23 Saturday (6); 16:00Z = 13:00 local
    const night = makeSession({
      type: "NIGHT_SLEEP",
      start_time: "2026-05-24T02:00:00Z",
      end_time: "2026-05-24T09:00:00Z",
    });
    const r = getNapPatternHeatmap([nap24, second, nap23a, night]);
    expect(r).toHaveLength(2);
    expect(r).toContainEqual({ dayOfWeek: 0, hour: 10, count: 2 });
    expect(r).toContainEqual({ dayOfWeek: 6, hour: 13, count: 1 });
  });
});

describe("getOverallStats", () => {
  it("returns zeros for no completed sessions", () => {
    expect(getOverallStats([])).toEqual({
      totalSleepMinutes: 0,
      napCount: 0,
      avgNapDuration: 0,
      longestStretch: 0,
    });
    expect(
      getOverallStats([makeSession({ type: "NAP" })]).totalSleepMinutes
    ).toBe(0);
  });

  it("aggregates totals, nap average and longest stretch", () => {
    const night = makeSession({
      type: "NIGHT_SLEEP",
      start_time: "2026-05-24T02:00:00Z",
      end_time: "2026-05-24T09:00:00Z", // 420
    });
    // naps: 60 + 30 + 60 = 150, avg 50
    const r = getOverallStats([nap23a, nap23b, nap24, night]);
    expect(r).toEqual({
      totalSleepMinutes: 570,
      napCount: 3,
      avgNapDuration: 50,
      longestStretch: 420,
    });
  });
});

describe("getLast24hStats", () => {
  it("only includes completed sessions that started within 24h of now", () => {
    // now = 2026-05-24T12:00Z; cutoff = 2026-05-23T12:00Z
    const inside = makeSession({
      type: "NAP",
      start_time: "2026-05-23T12:00:00Z", // exactly at cutoff -> included
      end_time: "2026-05-23T13:00:00Z", // 60
    });
    const outside = makeSession({
      type: "NAP",
      start_time: "2026-05-23T11:59:00Z",
      end_time: "2026-05-23T13:00:00Z",
    });
    const open = makeSession({ type: "NAP", start_time: "2026-05-24T11:00:00Z" });
    const r = getLast24hStats([inside, outside, open, nap24]);
    expect(r).toMatchObject({ totalSleepMinutes: 120, napCount: 2, longestStretch: 60 });
  });
});
