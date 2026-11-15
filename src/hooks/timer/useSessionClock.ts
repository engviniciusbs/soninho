"use client";

import { useNow } from "@/hooks/useNow";

/**
 * Whole seconds elapsed since `startIso`, read from the shared {@link useNow}
 * clock so every running-timer display (sleep timer, mini bar, wake-window
 * badge, breastfeeding sides) advances on the same tick.
 *
 * `elapsedSec` is `null` while there is no start (nothing subscribes then) and
 * on the server / first client render, before the clock has a value; callers
 * show their stopped value in that case.
 */
export function useSessionClock(startIso: string | null): { elapsedSec: number | null } {
  const now = useNow(1000, startIso !== null);
  if (startIso === null || now === null) return { elapsedSec: null };
  const start = new Date(startIso).getTime();
  return { elapsedSec: Math.floor(Math.max(0, now - start) / 1000) };
}
