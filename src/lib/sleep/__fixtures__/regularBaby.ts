import { fromZonedTime } from "date-fns-tz";
import type { SleepSession } from "@/types";
import { addDaysToKey } from "@/lib/dates/localDate";
import { makeSession } from "@/lib/sleep/__fixtures__/session";

export const SP = "America/Sao_Paulo";

/** An instant from a local São Paulo day ("yyyy-MM-dd") and time ("HH:mm"). */
export function spAt(day: string, time: string): Date {
  return fromZonedTime(`${day}T${time}:00`, SP);
}

function sleep(type: SleepSession["type"], start: Date, end: Date | null): SleepSession {
  return makeSession({
    id: `${type}-${start.toISOString()}`,
    type,
    start_time: start.toISOString(),
    end_time: end ? end.toISOString() : null,
  });
}

/**
 * A regular baby, 13,5 h a day: night 18:30–06:00 and naps 09:30–10:30 and
 * 14:00–15:00 (São Paulo), for the `days` days before `today`. The night of the
 * day before `today` ends at 06:00 of `today`. Pass `runningSince` to add a
 * sleep still running (night) that started at that time of `today`.
 */
export function regularBaby(
  today: string,
  days: number,
  opts: { todayNaps?: boolean; runningSince?: string } = {}
): SleepSession[] {
  const sessions: SleepSession[] = [];
  for (let k = days; k >= 1; k--) {
    const day = addDaysToKey(today, -k);
    sessions.push(sleep("NAP", spAt(day, "09:30"), spAt(day, "10:30")));
    sessions.push(sleep("NAP", spAt(day, "14:00"), spAt(day, "15:00")));
    sessions.push(sleep("NIGHT_SLEEP", spAt(day, "18:30"), spAt(addDaysToKey(day, 1), "06:00")));
  }
  if (opts.todayNaps) {
    sessions.push(sleep("NAP", spAt(today, "09:30"), spAt(today, "10:30")));
    sessions.push(sleep("NAP", spAt(today, "14:00"), spAt(today, "15:00")));
  }
  if (opts.runningSince) {
    sessions.push(sleep("NIGHT_SLEEP", spAt(today, opts.runningSince), null));
  }
  return sessions;
}
