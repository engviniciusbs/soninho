import { formatDuration } from "@/lib/utils";

/** Wake-window bound in the app's single duration format: "3h", "1h 15min", "45 min". */
export function formatWindowBound(total: number): string {
  return formatDuration(total);
}

/** "HH:MM:SS" (from useSleepTimer) back to seconds; 0 when malformed. */
export function elapsedToSeconds(elapsed: string): number {
  const [h, m, s] = elapsed.split(":").map(Number);
  if (![h, m, s].every(Number.isFinite)) return 0;
  return h * 3600 + m * 60 + s;
}
