import { fromZonedTime } from "date-fns-tz";
import { addDaysToKey, localDayKey } from "@/lib/dates/localDate";
import type { SleepSession } from "@/types";
import {
  allocateSessionToLocalDays,
  type DaySleepAllocation,
} from "@/lib/sleep/sessionDayAllocation";

export const DEFAULT_REPORT_TIMEZONE = "America/Sao_Paulo";

export function getReportPeriod(
  now: Date,
  days: number,
  timeZone: string
): {
  startUtc: Date;
  endUtc: Date;
  startKey: string;
  endKey: string;
  label: string;
} {
  const endKey = localDayKey(now, timeZone);
  const startKey = addDaysToKey(endKey, -(days - 1));
  const startUtc = fromZonedTime(`${startKey}T00:00:00`, timeZone);
  const endUtc = fromZonedTime(`${addDaysToKey(endKey, 1)}T00:00:00`, timeZone);
  const dm = (k: string) => `${k.slice(8, 10)}/${k.slice(5, 7)}`;
  return {
    startUtc,
    endUtc,
    startKey,
    endKey,
    label: `de ${dm(startKey)} a ${dm(endKey)} (últimos ${days} dias)`,
  };
}

export function groupSessionsByLocalDay(
  sessions: SleepSession[],
  timeZone: string
): Map<string, DaySleepAllocation[]> {
  const map = new Map<string, DaySleepAllocation[]>();
  for (const s of sessions) {
    for (const alloc of allocateSessionToLocalDays(s, timeZone)) {
      const list = map.get(alloc.dayKey) ?? [];
      list.push(alloc);
      map.set(alloc.dayKey, list);
    }
  }
  return map;
}
