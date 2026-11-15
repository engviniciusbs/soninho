import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInWeeks, differenceInMonths } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
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
  const birth = new Date(birthDate);
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
