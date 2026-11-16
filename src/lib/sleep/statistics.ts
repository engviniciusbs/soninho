import { format, startOfDay, eachDayOfInterval, subDays, getDay } from "date-fns";
import type { SleepSession, SleepStats } from "@/types";
import {
  allocateSessionToLocalDays,
  buildDailySleepTotals,
  getSessionEnd,
  lastDayKeysInTimeZone,
} from "@/lib/sleep/sessionDayAllocation";
import { withProvisionalEnd } from "@/lib/sleep/provisional";

export function getDailyTotals(
  sessions: SleepSession[],
  days: number = 7,
  timeZone?: string
): { date: string; totalHours: number; napHours: number; nightHours: number }[] {
  return buildDailySleepTotals(sessions, days, timeZone);
}

export function getNapCountPerDay(
  sessions: SleepSession[],
  days: number = 7,
  timeZone?: string
): { date: string; count: number }[] {
  const end = new Date();
  const start = subDays(startOfDay(end), days - 1);
  const interval = timeZone
    ? lastDayKeysInTimeZone(days, timeZone, end).map((k) => new Date(`${k}T12:00:00`))
    : eachDayOfInterval({ start, end });

  return interval.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const count = sessions.filter((s) => {
      if (s.type !== "NAP" || s.duration_min == null) return false;
      return allocateSessionToLocalDays(s, timeZone).some(
        (a) => a.dayKey === dayStr && a.napMinutes > 0
      );
    }).length;
    return { date: format(day, "dd/MM"), count };
  });
}

export function getLongestNightStretch(
  sessions: SleepSession[],
  days: number = 7,
  timeZone?: string
): { date: string; hours: number }[] {
  const end = new Date();
  const start = subDays(startOfDay(end), days - 1);
  const interval = timeZone
    ? lastDayKeysInTimeZone(days, timeZone, end).map((k) => new Date(`${k}T12:00:00`))
    : eachDayOfInterval({ start, end });

  return interval.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");

    let longestNightMinutes = 0;
    for (const session of sessions) {
      if (session.type !== "NIGHT_SLEEP" || session.duration_min == null) {
        continue;
      }
      for (const alloc of allocateSessionToLocalDays(session, timeZone)) {
        if (alloc.dayKey === dayStr) {
          longestNightMinutes = Math.max(
            longestNightMinutes,
            alloc.nightMinutes
          );
        }
      }
    }

    return {
      date: format(day, "dd/MM"),
      hours: parseFloat((longestNightMinutes / 60).toFixed(1)),
    };
  });
}

export function getNapPatternHeatmap(
  sessions: SleepSession[]
): { dayOfWeek: number; hour: number; count: number }[] {
  const heatmap: Record<string, number> = {};

  sessions
    .filter((s) => s.type === "NAP")
    .forEach((s) => {
      const d = new Date(s.start_time);
      const key = `${getDay(d)}-${d.getHours()}`;
      heatmap[key] = (heatmap[key] || 0) + 1;
    });

  return Object.entries(heatmap).map(([key, count]) => {
    const [dayOfWeek, hour] = key.split("-").map(Number);
    return { dayOfWeek, hour, count };
  });
}

export function getOverallStats(sessions: SleepSession[]): SleepStats {
  const completed = sessions.filter((s) => s.duration_min != null);
  const totalSleepMinutes = completed.reduce(
    (a, s) => a + (s.duration_min ?? 0),
    0
  );
  const naps = completed.filter((s) => s.type === "NAP");
  const napCount = naps.length;
  const avgNapDuration =
    napCount > 0
      ? naps.reduce((a, s) => a + (s.duration_min ?? 0), 0) / napCount
      : 0;
  const longestStretch = completed.length
    ? Math.max(...completed.map((s) => s.duration_min ?? 0))
    : 0;

  return { totalSleepMinutes, napCount, avgNapDuration, longestStretch };
}

export interface Last24hStats {
  /** Minutes slept inside the last 24 h, a sleep still running included up to now. */
  totalMinutes: number;
  /**
   * Longest finished night sleep (NIGHT_SLEEP only, naps never count) that
   * touches the last 24 h, whole, in minutes; 0 when there is none.
   */
  longestNightMinutes: number;
}

/**
 * "Sono 24h" and "Maior trecho noturno": each sleep counts by its overlap
 * with [now - 24 h, now], so last night still counts at 19:00 even though it
 * started more than 24 h ago, and the night running since 18:30 counts too.
 */
export function getLast24hStats(
  sessions: SleepSession[],
  now: Date = new Date()
): Last24hStats {
  const end = now.getTime();
  const start = end - 24 * 60 * 60 * 1000;
  let totalMs = 0;
  let longestNightMinutes = 0;
  for (const session of sessions) {
    const counted = withProvisionalEnd(session, now);
    const sessionEnd = getSessionEnd(counted);
    if (!sessionEnd) continue;
    const s = Date.parse(counted.start_time);
    const e = sessionEnd.getTime();
    const overlap = Math.min(e, end) - Math.max(s, start);
    if (overlap <= 0) continue;
    totalMs += overlap;
    if (session.type === "NIGHT_SLEEP" && session.end_time != null) {
      longestNightMinutes = Math.max(longestNightMinutes, Math.round((e - s) / 60_000));
    }
  }
  return { totalMinutes: Math.round(totalMs / 60_000), longestNightMinutes };
}

/** "Última noite" is only shown for a night that ended this recently. */
const LAST_NIGHT_MAX_AGE_MS = 72 * 60 * 60_000;

/**
 * The most recent finished night sleep that ended within the last 72 h,
 * whole, in minutes; `null` without one. "Maior trecho noturno" falls back to
 * it when no night touches the last 24 h.
 */
export function getLastFinishedNightMinutes(
  sessions: SleepSession[],
  now: Date = new Date()
): number | null {
  let last: { end: number; minutes: number } | null = null;
  for (const s of sessions) {
    if (s.type !== "NIGHT_SLEEP" || s.end_time == null) continue;
    const end = Date.parse(s.end_time);
    if (end > now.getTime() || now.getTime() - end > LAST_NIGHT_MAX_AGE_MS) continue;
    if (last === null || end > last.end) {
      last = { end, minutes: Math.round((end - Date.parse(s.start_time)) / 60_000) };
    }
  }
  return last && last.minutes > 0 ? last.minutes : null;
}
