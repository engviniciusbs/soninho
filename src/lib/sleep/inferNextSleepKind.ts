import { formatInTimeZone } from "date-fns-tz";
import { getAgeSchedule } from "@/lib/sleep/schedules";
import type { SleepSession, SleepType } from "@/types";

export type NextSleepKind = SleepType;

function localHour(iso: string, tz: string): number {
  const h = Number(formatInTimeZone(new Date(iso), tz, "H"));
  const m = Number(formatInTimeZone(new Date(iso), tz, "m"));
  return h + m / 60;
}

function localDateKey(iso: string, tz: string): string {
  return formatInTimeZone(new Date(iso), tz, "yyyy-MM-dd");
}

/** Latest typical end time for a daytime nap (local hour, decimal). */
function lastNapCutoffHour(ageWeeks: number): number {
  if (ageWeeks <= 8) return 18;
  if (ageWeeks <= 16) return 17;
  if (ageWeeks <= 28) return 16.5;
  return 15.5;
}

function expectedMaxNaps(ageWeeks: number): number {
  const schedule = getAgeSchedule(ageWeeks);
  const upper = schedule.napCount.split("–").pop()?.trim() ?? "2";
  const parsed = parseInt(upper, 10);
  return Number.isFinite(parsed) ? parsed : 2;
}

function countTodayNaps(
  sessions: SleepSession[],
  tz: string,
  now: Date
): number {
  const today = localDateKey(now.toISOString(), tz);
  return sessions.filter(
    (s) =>
      s.type === "NAP" &&
      s.end_time &&
      localDateKey(s.start_time, tz) === today
  ).length;
}

/** Median night-sleep start hour from recent history (needs ≥3 nights). */
function medianBedtimeHour(
  sessions: SleepSession[],
  tz: string
): number | null {
  const hours = sessions
    .filter((s) => s.type === "NIGHT_SLEEP" && s.end_time)
    .slice(0, 21)
    .map((s) => localHour(s.start_time, tz))
    .sort((a, b) => a - b);

  if (hours.length < 3) return null;
  return hours[Math.floor(hours.length / 2)];
}

export function inferNextSleepKind(params: {
  lastSessionType: SleepType | null;
  lastSleepEndIso: string;
  recentSessions: SleepSession[];
  ageWeeks: number;
  timezone: string;
  windowStartHour: number;
  windowEndHour: number;
  now?: Date;
}): NextSleepKind {
  const now = params.now ?? new Date();
  const tz = params.timezone;
  const lastEndHour = localHour(params.lastSleepEndIso, tz);
  const nowHour = localHour(now.toISOString(), tz);

  if (params.lastSessionType === "NIGHT_SLEEP") {
    // Woke from night sleep this morning → next sleep is a nap.
    if (lastEndHour < 13) return "NAP";
    // Unusual late wake — still nap unless it's already evening with none today.
    const napsToday = countTodayNaps(params.recentSessions, tz, now);
    if (napsToday === 0 && nowHour >= 17) return "NIGHT_SLEEP";
    return "NAP";
  }

  const napsToday = countTodayNaps(params.recentSessions, tz, now);
  const maxNaps = expectedMaxNaps(params.ageWeeks);
  const cutoff = lastNapCutoffHour(params.ageWeeks);
  const medianBedtime = medianBedtimeHour(params.recentSessions, tz);

  // Last nap ended late in the day → bedtime, not another nap.
  if (lastEndHour >= cutoff) return "NIGHT_SLEEP";

  // Already had enough naps today.
  if (napsToday >= maxNaps) return "NIGHT_SLEEP";

  // Wake window falls in typical bedtime range.
  if (params.windowEndHour >= 18 && nowHour >= 16) return "NIGHT_SLEEP";

  // Matches the baby's own bedtime pattern (±90 min).
  if (medianBedtime != null) {
    const midpoint = (params.windowStartHour + params.windowEndHour) / 2;
    if (Math.abs(midpoint - medianBedtime) <= 1.5) return "NIGHT_SLEEP";
  }

  return "NAP";
}
