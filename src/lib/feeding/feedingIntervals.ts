/** Typical interval between milk feeds (bottle/breast) by age, in minutes. Fallback only — real history takes priority. */
const FEEDING_INTERVALS: { maxWeeks: number; minutes: number }[] = [
  { maxWeeks: 4, minutes: 150 },
  { maxWeeks: 12, minutes: 180 },
  { maxWeeks: 26, minutes: 210 },
  { maxWeeks: 52, minutes: 240 },
];

const DEFAULT_INTERVAL_MINUTES = 270;

export function getDefaultFeedingIntervalMinutes(ageWeeks: number): number {
  for (const entry of FEEDING_INTERVALS) {
    if (ageWeeks <= entry.maxWeeks) return entry.minutes;
  }
  return DEFAULT_INTERVAL_MINUTES;
}
