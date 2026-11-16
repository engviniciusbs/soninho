/** Shared bits of the Análise charts. */

import { formatDuration } from "@/lib/utils";
import { formatDecimal } from "@/lib/format/number";

/** The last day of a series is today, still running: name it so its point is not read as final. */
export function todayLabel<T extends { date: string }>(data: T[]) {
  const last = data[data.length - 1]?.date;
  return (date: string) => (date === last ? "hoje" : date);
}

/**
 * A value with its unit, in pt-BR. Durations ("h" or "min") read as
 * "10h 54min" (the app's single duration format); anything else gets a comma
 * decimal and the unit ("4,5").
 */
export function formatValue(v: number, unit: string): string {
  if (unit === "h") return formatDuration(v * 60);
  if (unit === "min") return formatDuration(v);
  return `${formatDecimal(v)}${unit}`;
}

/**
 * Recharts measures its container; before that (and in tests) it draws at this
 * size instead of nothing. The real width replaces it on the first measure.
 */
export const INITIAL_SIZE = { width: 320, height: 180 };
