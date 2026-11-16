import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDailyQuality, summarizePeriod } from "@/lib/sleep/periodSummary";
import { makeSession } from "@/lib/sleep/__fixtures__/session";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-24T12:00:00Z")); // Sunday 24/05, 09:00 local
});
afterEach(() => {
  vi.useRealTimers();
});

// Local times are America/Sao_Paulo (UTC-3).
// Night 22/05 19:00 to 23/05 06:00 (11h, 5h on 22/05 and 6h on 23/05).
const night22 = makeSession({
  type: "NIGHT_SLEEP",
  start_time: "2026-05-22T22:00:00Z",
  end_time: "2026-05-23T09:00:00Z",
});
// Night 23/05 19:00 to 24/05 05:00 (10h, 5h on 23/05 and 5h on 24/05, today).
const night23 = makeSession({
  type: "NIGHT_SLEEP",
  start_time: "2026-05-23T22:00:00Z",
  end_time: "2026-05-24T08:00:00Z",
});
// Two naps on 23/05: 10:00-11:00 and 14:00-15:30.
const nap23a = makeSession({ type: "NAP", start_time: "2026-05-23T13:00:00Z", end_time: "2026-05-23T14:00:00Z" });
const nap23b = makeSession({ type: "NAP", start_time: "2026-05-23T17:00:00Z", end_time: "2026-05-23T18:30:00Z" });
// One nap today 24/05, 07:00-08:00.
const napToday = makeSession({ type: "NAP", start_time: "2026-05-24T10:00:00Z", end_time: "2026-05-24T11:00:00Z" });

describe("summarizePeriod", () => {
  it("averages_only_complete_days_with_sleep_and_leaves_today_out", () => {
    const r = summarizePeriod([night22, night23, nap23a, nap23b, napToday], 7);
    // Complete days with data: 22/05 (5h) and 23/05 (6h + 5h + 1h + 1h30 = 13h30).
    expect(r.daysWithData).toBe(2);
    expect(r.avgSleepMinutes).toBe((300 + 810) / 2);
    // Naps: 0 on 22/05, 2 on 23/05; today's nap is not counted.
    expect(r.avgNapsPerDay).toBe(1);
    // The whole night, not the part on one side of midnight.
    expect(r.longestNightMinutes).toBe(660);
  });

  it("no_sleep_at_all_gives_no_figures_instead_of_zeros", () => {
    expect(summarizePeriod([], 7)).toEqual({
      daysWithData: 0,
      avgSleepMinutes: null,
      avgNapsPerDay: null,
      longestNightMinutes: null,
    });
  });

  it("only_today_logged_gives_no_figures_yet", () => {
    const r = summarizePeriod([napToday], 7);
    expect(r.daysWithData).toBe(0);
    expect(r.avgSleepMinutes).toBeNull();
    expect(r.avgNapsPerDay).toBeNull();
  });

  it("a_night_still_running_across_midnight_counts_on_yesterday_but_is_not_a_finished_night", () => {
    // Running since 23/05 19:00; now is 24/05 09:00. Yesterday is complete and slept 19:00 to 24:00.
    const running = makeSession({ type: "NIGHT_SLEEP", start_time: "2026-05-23T22:00:00Z", end_time: null });
    const r = summarizePeriod([running, nap23a], 7);
    expect(r.daysWithData).toBe(1);
    expect(r.avgSleepMinutes).toBe(300 + 60);
    expect(r.avgNapsPerDay).toBe(1);
    expect(r.longestNightMinutes).toBeNull();
  });

  it("a_night_running_since_before_yesterday_fills_every_complete_day_it_crossed", () => {
    // Running since 22/05 19:00: 22/05 gets 5h, 23/05 the whole 24h; today stays out.
    const running = makeSession({ type: "NIGHT_SLEEP", start_time: "2026-05-22T22:00:00Z", end_time: null });
    const r = summarizePeriod([running], 7);
    expect(r.daysWithData).toBe(2);
    expect(r.avgSleepMinutes).toBe((300 + 1440) / 2);
    expect(r.longestNightMinutes).toBeNull();
  });

  it("a_sleep_running_since_after_midnight_leaves_the_complete_days_alone", () => {
    const running = makeSession({ type: "NAP", start_time: "2026-05-24T11:30:00Z", end_time: null });
    const r = summarizePeriod([running, nap23a], 7);
    expect(r.avgSleepMinutes).toBe(60);
  });

  it("ignores_days_before_the_period", () => {
    // 1 day: only today, which is never complete.
    expect(summarizePeriod([night22, nap23a], 1).daysWithData).toBe(0);
    // 2 days: 23/05 and today. The night of 22/05 counts its part on 23/05 and is the longest night.
    const r = summarizePeriod([night22, nap23a], 2);
    expect(r.daysWithData).toBe(1);
    expect(r.avgSleepMinutes).toBe(360 + 60);
    expect(r.longestNightMinutes).toBe(660);
  });
});

describe("getDailyQuality", () => {
  it("averages_the_rated_sleeps_of_each_day_and_leaves_gaps_without_ratings", () => {
    const r = getDailyQuality(
      [
        { ...nap23a, quality: 4 },
        { ...nap23b, quality: 3 },
        { ...night22, quality: 5 },
        { ...napToday, quality: null },
      ],
      3
    );
    expect(r).toEqual([
      { date: "22/05", avgQuality: 5 },
      { date: "23/05", avgQuality: 3.5 },
      { date: "24/05", avgQuality: null },
    ]);
  });

  it("has_no_rating_when_nothing_was_rated", () => {
    expect(getDailyQuality([nap23a], 2).every((d) => d.avgQuality === null)).toBe(true);
  });
});
