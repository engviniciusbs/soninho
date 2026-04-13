import { format, startOfDay, eachDayOfInterval, subDays, getDay } from "date-fns";
import type { SleepSession, SleepStats } from "@/types";

export function getDailyTotals(
  sessions: SleepSession[],
  days: number = 7
): { date: string; totalHours: number; napHours: number; nightHours: number }[] {
  const end = new Date();
  const start = subDays(startOfDay(end), days - 1);
  const interval = eachDayOfInterval({ start, end });

  return interval.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const daySessions = sessions.filter(
      (s) =>
        format(new Date(s.start_time), "yyyy-MM-dd") === dayStr &&
        s.duration_min != null
    );

    const napMin = daySessions
      .filter((s) => s.type === "NAP")
      .reduce((a, s) => a + (s.duration_min ?? 0), 0);

    const nightMin = daySessions
      .filter((s) => s.type === "NIGHT_SLEEP")
      .reduce((a, s) => a + (s.duration_min ?? 0), 0);

    return {
      date: format(day, "dd/MM"),
      totalHours: parseFloat(((napMin + nightMin) / 60).toFixed(1)),
      napHours: parseFloat((napMin / 60).toFixed(1)),
      nightHours: parseFloat((nightMin / 60).toFixed(1)),
    };
  });
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
    const count = sessions.filter(
      (s) =>
        format(new Date(s.start_time), "yyyy-MM-dd") === dayStr &&
        s.type === "NAP" &&
        s.duration_min != null
    ).length;
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
    const nightSessions = sessions.filter(
      (s) =>
        format(new Date(s.start_time), "yyyy-MM-dd") === dayStr &&
        s.type === "NIGHT_SLEEP" &&
        s.duration_min != null
    );

    const longest = nightSessions.length
      ? Math.max(...nightSessions.map((s) => s.duration_min ?? 0))
      : 0;

    return {
      date: format(day, "dd/MM"),
      hours: parseFloat((longest / 60).toFixed(1)),
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
