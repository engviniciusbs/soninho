import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInWeeks, differenceInMonths } from "date-fns";
import { parseLocalDate } from "@/lib/dates/localDate";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * The app's one duration format: whole minutes as "40 min", "1h 30min" or
 * "2h" (mockup copy). Rounds first, so 119.6 min is "2h", never "1h 60min".
 */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h ${rest}min`;
}

export function formatElapsed(startTime: string, now: number = Date.now()): string {
  const start = new Date(startTime).getTime();
  return formatElapsedSeconds(Math.floor(Math.max(0, now - start) / 1000));
}

/** Whole seconds as "HH:MM:SS" (hours are not capped at 24). */
export function formatElapsedSeconds(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getBabyAge(birthDate: string) {
  const birth = parseLocalDate(birthDate);
  const now = new Date();
  return {
    weeks: differenceInWeeks(now, birth),
    months: differenceInMonths(now, birth),
  };
}

export function formatTimeRange(start: string, end: string | null): string {
  const s = new Date(start);
  const startStr = s.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!end) return `${startStr} — agora`;
  const e = new Date(end);
  const endStr = e.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startStr} — ${endStr}`;
}
