import { format, startOfDay, eachDayOfInterval, subDays, getDay } from "date-fns";
import type { SleepSession, SleepStats } from "@/types";
import {
  allocateSessionToLocalDays,
  buildDailySleepTotals,
} from "@/lib/sleep/sessionDayAllocation";

export function getDailyTotals(
  sessions: SleepSession[],
  days: number = 7
): { date: string; totalHours: number; napHours: number; nightHours: number }[] {
  return buildDailySleepTotals(sessions, days);
}

export function getNapCountPerDay(
  sessions: SleepSession[],
  days: number = 7
): { date: string; count: number }[] {
  const end = new Date();
  const start = subDays(startOfDay(end), days - 1);
  const interval = eachDayOfInterval({ start, end });

  return interval.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const count = sessions.filter((s) => {
      if (s.type !== "NAP" || s.duration_min == null) return false;
      return allocateSessionToLocalDays(s).some(
        (a) => a.dayKey === dayStr && a.napMinutes > 0
      );
    }).length;
    return { date: format(day, "dd/MM"), count };
  });
}

export function getLongestNightStretch(
  sessions: SleepSession[],
  days: number = 7
): { date: string; hours: number }[] {
  const end = new Date();
  const start = subDays(startOfDay(end), days - 1);
  const interval = eachDayOfInterval({ start, end });

  return interval.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");

    let longestNightMinutes = 0;
    for (const session of sessions) {
      if (session.type !== "NIGHT_SLEEP" || session.duration_min == null) {
        continue;
      }
      for (const alloc of allocateSessionToLocalDays(session)) {
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

export function getLast24hStats(sessions: SleepSession[]): SleepStats {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = sessions.filter(
    (s) => new Date(s.start_time) >= cutoff && s.duration_min != null
  );
  return getOverallStats(recent);
}
