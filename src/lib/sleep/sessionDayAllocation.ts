import { addDays, format, max, min, startOfDay, subDays, eachDayOfInterval } from "date-fns";
import type { SleepSession } from "@/types";

export type DaySleepAllocation = {
  /** Local calendar day (yyyy-MM-dd) */
  dayKey: string;
  napMinutes: number;
  nightMinutes: number;
};

/** Resolved end instant for a completed session. */
export function getSessionEnd(session: SleepSession): Date | null {
  if (session.end_time) {
    return new Date(session.end_time);
  }
  if (session.duration_min != null) {
    return new Date(
      new Date(session.start_time).getTime() + session.duration_min * 60_000
    );
  }
  return null;
}

/**
 * Split a completed session into local calendar days by actual time overlap.
 * Night sleep from 23/05 18:30 → 24/05 06:09 yields minutes on both days.
 */
export function allocateSessionToLocalDays(
  session: SleepSession
): DaySleepAllocation[] {
  if (session.duration_min == null) return [];

  const start = new Date(session.start_time);
  const end = getSessionEnd(session);
  if (!end || end <= start) return [];

  const isNap = session.type === "NAP";
  const byDay = new Map<string, DaySleepAllocation>();

  let dayCursor = startOfDay(start);
  const lastDay = startOfDay(end);

  while (dayCursor <= lastDay) {
    const dayEndExclusive = addDays(dayCursor, 1);
    const overlapStart = max([start, dayCursor]);
    const overlapEnd = min([end, dayEndExclusive]);

    if (overlapEnd > overlapStart) {
      const minutes = Math.round(
        (overlapEnd.getTime() - overlapStart.getTime()) / 60_000
      );
      const dayKey = format(dayCursor, "yyyy-MM-dd");
      const existing = byDay.get(dayKey) ?? {
        dayKey,
        napMinutes: 0,
        nightMinutes: 0,
      };
      if (isNap) {
        existing.napMinutes += minutes;
      } else {
        existing.nightMinutes += minutes;
      }
      byDay.set(dayKey, existing);
    }

    dayCursor = addDays(dayCursor, 1);
  }

  return Array.from(byDay.values());
}

export type DaySleepTotals = {
  date: string;
  totalHours: number;
  napHours: number;
  nightHours: number;
};

/**
 * Aggregate sleep minutes per local day for the last N calendar days (inclusive of today).
 * Includes overlap from sessions that started before the window.
 */
export function buildDailySleepTotals(
  sessions: SleepSession[],
  days: number = 7
): DaySleepTotals[] {
  const end = new Date();
  const rangeStart = subDays(startOfDay(end), days - 1);
  const interval = eachDayOfInterval({ start: rangeStart, end });

  const totals = new Map<string, { napMin: number; nightMin: number }>();
  for (const day of interval) {
    totals.set(format(day, "yyyy-MM-dd"), { napMin: 0, nightMin: 0 });
  }

  for (const session of sessions) {
    if (session.duration_min == null) continue;

    for (const alloc of allocateSessionToLocalDays(session)) {
      const bucket = totals.get(alloc.dayKey);
      if (!bucket) continue;
      bucket.napMin += alloc.napMinutes;
      bucket.nightMin += alloc.nightMinutes;
    }
  }

  return interval.map((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const { napMin, nightMin } = totals.get(dayKey) ?? {
      napMin: 0,
      nightMin: 0,
    };
    return {
      date: format(day, "dd/MM"),
      totalHours: parseFloat(((napMin + nightMin) / 60).toFixed(1)),
      napHours: parseFloat((napMin / 60).toFixed(1)),
      nightHours: parseFloat((nightMin / 60).toFixed(1)),
    };
  });
}
