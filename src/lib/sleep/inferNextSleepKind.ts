import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { getAgeSchedule } from "@/lib/sleep/schedules";
import { getWakeWindowRange } from "@/lib/sleep/wakeWindows";
import type { SleepSession, SleepType } from "@/types";

export type NextSleepKind = SleepType;

/** The session fields the inference reads. */
type RecentSession = Pick<SleepSession, "type" | "start_time" | "end_time">;

/** A night that ended in [19:00, 05:00) local was a night waking, not the morning. */
const NIGHT_WAKING_FROM = 19;
const NIGHT_WAKING_UNTIL = 5;
/** A wake window ending at or after this local hour leads into the night. */
const BEDTIME_WINDOW_END = 18;
/** After a late wake from the night, from this hour on the next sleep is the night. */
const EVENING_HOUR = 17;

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
  sessions: RecentSession[],
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
  sessions: RecentSession[],
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
  recentSessions: RecentSession[];
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

  // A sleep that ended between 19:00 and 05:00 is a night waking: the baby
  // goes back to the night sleep.
  if (lastEndHour >= NIGHT_WAKING_FROM || lastEndHour < NIGHT_WAKING_UNTIL) {
    return "NIGHT_SLEEP";
  }

  // The wake window runs into the evening → bedtime, whatever time it is now.
  if (params.windowEndHour >= BEDTIME_WINDOW_END) return "NIGHT_SLEEP";

  if (params.lastSessionType === "NIGHT_SLEEP") {
    // Woke from night sleep this morning → next sleep is a nap.
    if (lastEndHour < 13) return "NAP";
    // Unusual late wake: a nap, unless it's already evening.
    return nowHour >= EVENING_HOUR ? "NIGHT_SLEEP" : "NAP";
  }

  const napsToday = countTodayNaps(params.recentSessions, tz, now);
  const maxNaps = expectedMaxNaps(params.ageWeeks);
  const cutoff = lastNapCutoffHour(params.ageWeeks);
  const medianBedtime = medianBedtimeHour(params.recentSessions, tz);

  // Last nap ended late in the day → bedtime, not another nap.
  if (lastEndHour >= cutoff) return "NIGHT_SLEEP";

  // Already had enough naps today.
  if (napsToday >= maxNaps) return "NIGHT_SLEEP";

  // Matches the baby's own bedtime pattern (±90 min).
  if (medianBedtime != null) {
    const midpoint = (params.windowStartHour + params.windowEndHour) / 2;
    if (Math.abs(midpoint - medianBedtime) <= 1.5) return "NIGHT_SLEEP";
  }

  return "NAP";
}

function clockHourAt(at: Date, tz: string): number {
  const [h, m] = formatInTimeZone(at, tz, "HH:mm").split(":").map(Number);
  return h + m / 60;
}

/**
 * {@link inferNextSleepKind} with the wake window taken from the age table
 * ({@link getWakeWindowRange}), anchored at the last sleep's end. Shared by the
 * home suggestion and the push alerts so both apply the same rule.
 */
export function inferNextSleepKindForAge(params: {
  lastSessionType: SleepType | null;
  lastSleepEndIso: string;
  recentSessions: RecentSession[];
  ageWeeks: number;
  timezone: string;
  now?: Date;
}): NextSleepKind {
  const range = getWakeWindowRange(params.ageWeeks);
  const anchor = new Date(params.lastSleepEndIso);
  return inferNextSleepKind({
    ...params,
    windowStartHour: clockHourAt(addMinutes(anchor, range.minMinutes), params.timezone),
    windowEndHour: clockHourAt(addMinutes(anchor, range.maxMinutes), params.timezone),
  });
}
