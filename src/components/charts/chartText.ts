/** Shared bits of the Análise charts. */

/** The last day of a series is today, still running: name it so its point is not read as final. */
export function todayLabel<T extends { date: string }>(data: T[]) {
  const last = data[data.length - 1]?.date;
  return (date: string) => (date === last ? "hoje" : date);
}

/** A value with a PT-BR decimal and its unit ("10,9h"). */
export function formatValue(v: number, unit: string): string {
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${unit}`;
}

/**
 * Recharts measures its container; before that (and in tests) it draws at this
 * size instead of nothing. The real width replaces it on the first measure.
 */
export const INITIAL_SIZE = { width: 320, height: 180 };
