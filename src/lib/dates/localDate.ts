import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

/**
 * Local calendar dates ("yyyy-MM-dd", e.g. babies.birth_date).
 *
 * `new Date("2026-02-10")` is UTC midnight, which is 21:00 of the previous day
 * in São Paulo: birth dates showed one day early. Always go through these
 * helpers instead.
 */

/** "yyyy-MM-dd" as local midnight of that day (no UTC shift). */
export function parseLocalDate(ymd: string): Date {
  return parseISO(ymd);
}

/** Formats a "yyyy-MM-dd" date with a date-fns pattern (default dd/MM/yyyy). */
export function formatLocalDate(ymd: string, pattern = "dd/MM/yyyy"): string {
  return format(parseLocalDate(ymd), pattern);
}

/** The local day ("yyyy-MM-dd") of an instant in the given IANA timezone. */
export function localDayKey(at: Date, tz: string): string {
  return formatInTimeZone(at, tz, "yyyy-MM-dd");
}

/** Calendar arithmetic on "yyyy-MM-dd" keys, independent of any timezone. */
export function addDaysToKey(key: string, n: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
