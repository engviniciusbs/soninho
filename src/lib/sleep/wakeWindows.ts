import type { WakeWindowRange } from "@/types";

const WAKE_WINDOWS: { maxWeeks: number; range: WakeWindowRange }[] = [
  { maxWeeks: 6, range: { minMinutes: 45, maxMinutes: 60, label: "0–6 semanas" } },
  { maxWeeks: 8, range: { minMinutes: 60, maxMinutes: 75, label: "6–8 semanas" } },
  { maxWeeks: 12, range: { minMinutes: 75, maxMinutes: 90, label: "2 meses" } },
  { maxWeeks: 16, range: { minMinutes: 90, maxMinutes: 120, label: "3 meses" } },
  { maxWeeks: 20, range: { minMinutes: 105, maxMinutes: 135, label: "4 meses" } },
  { maxWeeks: 24, range: { minMinutes: 120, maxMinutes: 150, label: "5 meses" } },
  { maxWeeks: 28, range: { minMinutes: 150, maxMinutes: 180, label: "6 meses" } },
  { maxWeeks: 36, range: { minMinutes: 165, maxMinutes: 210, label: "7–8 meses" } },
  { maxWeeks: 52, range: { minMinutes: 180, maxMinutes: 240, label: "9–12 meses" } },
];

const DEFAULT_RANGE: WakeWindowRange = {
  minMinutes: 180,
  maxMinutes: 240,
  label: "9–12 meses",
};

export function getWakeWindowRange(ageWeeks: number): WakeWindowRange {
  for (const entry of WAKE_WINDOWS) {
    if (ageWeeks <= entry.maxWeeks) return entry.range;
  }
  return DEFAULT_RANGE;
}

export type WakeWindowStatus = "green" | "yellow" | "red";

export function getWakeWindowStatus(
  elapsedMinutes: number,
  range: WakeWindowRange
): WakeWindowStatus {
  if (elapsedMinutes <= range.maxMinutes - 15) return "green";
  if (elapsedMinutes <= range.maxMinutes) return "yellow";
  return "red";
}

export function getMinutesUntilNextNap(
  elapsedMinutes: number,
  range: WakeWindowRange
): number {
  return Math.max(0, range.maxMinutes - elapsedMinutes);
}
