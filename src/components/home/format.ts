/** Whole minutes as "40 min", "1h 30min" or "2h" (mockup copy). */
export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h ${rest}min`;
}

/** Wake-window bound as "3h", "1h15" or "45 min". */
export function formatWindowBound(total: number): string {
  const m = Math.max(0, Math.round(total));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h${String(rest).padStart(2, "0")}`;
}

/** "HH:MM:SS" (from useSleepTimer) back to seconds; 0 when malformed. */
export function elapsedToSeconds(elapsed: string): number {
  const [h, m, s] = elapsed.split(":").map(Number);
  if (![h, m, s].every(Number.isFinite)) return 0;
  return h * 3600 + m * 60 + s;
}
