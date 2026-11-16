import { eachDayOfInterval, format, startOfDay, subDays } from "date-fns";
import type { SleepSession } from "@/types";
import { fromZonedTime } from "date-fns-tz";
import {
  allocateSessionToLocalDays,
  buildCompleteDailySleepMinutes,
} from "@/lib/sleep/sessionDayAllocation";
import { withProvisionalEnd } from "@/lib/sleep/provisional";

export interface PeriodSummary {
  /** Complete days of the period (the `days` days before today) with some sleep logged. */
  daysWithData: number;
  /** Average sleep per complete day with data, in minutes. */
  avgSleepMinutes: number | null;
  /** Average naps per complete day with data. */
  avgNapsPerDay: number | null;
  /** Longest finished night sleep that touches the period, whole (not split at midnight), in minutes. */
  longestNightMinutes: number | null;
}

function periodDays(days: number, now: Date): Date[] {
  return eachDayOfInterval({ start: subDays(startOfDay(now), days - 1), end: now });
}

/**
 * The three figures of the Análise screen for the `days` complete local days
 * before today — the same days as the sleep debt — in exact minutes
 * ({@link buildCompleteDailySleepMinutes}).
 *
 * Averages use only the days with sleep logged (a day nobody logged is not a
 * day without sleep, the same rule as `computeSleepDebt`). A sleep still
 * running counts up to now; it is never the "maior noite", which must be
 * finished. With no such day every figure is `null`: the screen shows an empty
 * state, never zeros.
 */
export function summarizePeriod(
  sessions: SleepSession[],
  days: number,
  now: Date = new Date(),
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): PeriodSummary {
  const totals = buildCompleteDailySleepMinutes(sessions, days, timeZone, now);
  const keys = totals.map((d) => d.dayKey);

  // A nap counts on the day it slept on, as in `getNapCountPerDay`.
  const naps = new Map<string, number>();
  for (const session of sessions) {
    if (session.type !== "NAP") continue;
    for (const alloc of allocateSessionToLocalDays(withProvisionalEnd(session, now), timeZone)) {
      if (alloc.napMinutes > 0) naps.set(alloc.dayKey, (naps.get(alloc.dayKey) ?? 0) + 1);
    }
  }

  const withData = totals
    .map((d) => ({ minutes: d.napMinutes + d.nightMinutes, naps: naps.get(d.dayKey) ?? 0 }))
    .filter((d) => d.minutes > 0);
  if (withData.length === 0) {
    return { daysWithData: 0, avgSleepMinutes: null, avgNapsPerDay: null, longestNightMinutes: null };
  }

  const rangeStart = fromZonedTime(`${keys[0]}T00:00:00`, timeZone).getTime();
  const nights = sessions.filter(
    (s) =>
      s.type === "NIGHT_SLEEP" &&
      s.duration_min != null &&
      s.end_time != null &&
      Date.parse(s.end_time) >= rangeStart
  );

  return {
    daysWithData: withData.length,
    avgSleepMinutes: withData.reduce((a, d) => a + d.minutes, 0) / withData.length,
    avgNapsPerDay: withData.reduce((a, d) => a + d.naps, 0) / withData.length,
    longestNightMinutes: nights.length > 0 ? Math.max(...nights.map((s) => s.duration_min ?? 0)) : null,
  };
}

/**
 * Average quality (1 to 5) of the rated sleeps per local day, by the day the
 * sleep started. A day with no rating is `null` (a gap), never 0.
 */
export function getDailyQuality(
  sessions: SleepSession[],
  days: number,
  now: Date = new Date()
): { date: string; avgQuality: number | null }[] {
  const byDay = new Map<string, number[]>();
  for (const s of sessions) {
    if (s.quality == null || s.duration_min == null) continue;
    const key = format(new Date(s.start_time), "yyyy-MM-dd");
    (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(s.quality);
  }

  return periodDays(days, now).map((day) => {
    const ratings = byDay.get(format(day, "yyyy-MM-dd"));
    return {
      date: format(day, "dd/MM"),
      avgQuality: ratings
        ? parseFloat((ratings.reduce((a, q) => a + q, 0) / ratings.length).toFixed(1))
        : null,
    };
  });
}
