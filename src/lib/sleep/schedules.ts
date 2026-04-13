export interface AgeSchedule {
  ageLabel: string;
  totalSleepHours: number;
  napCount: string;
  nightSleepHours: number;
}

const SCHEDULES: { maxWeeks: number; schedule: AgeSchedule }[] = [
  {
    maxWeeks: 6,
    schedule: { ageLabel: "0–6 semanas", totalSleepHours: 16, napCount: "4–6", nightSleepHours: 8 },
  },
  {
    maxWeeks: 12,
    schedule: { ageLabel: "2–3 meses", totalSleepHours: 15, napCount: "3–5", nightSleepHours: 9 },
  },
  {
    maxWeeks: 20,
    schedule: { ageLabel: "4–5 meses", totalSleepHours: 14.5, napCount: "3–4", nightSleepHours: 10 },
  },
  {
    maxWeeks: 28,
    schedule: { ageLabel: "6–7 meses", totalSleepHours: 14, napCount: "2–3", nightSleepHours: 11 },
  },
  {
    maxWeeks: 36,
    schedule: { ageLabel: "7–9 meses", totalSleepHours: 14, napCount: "2", nightSleepHours: 11 },
  },
  {
    maxWeeks: 52,
    schedule: { ageLabel: "9–12 meses", totalSleepHours: 13.5, napCount: "2", nightSleepHours: 11 },
  },
];

const DEFAULT: AgeSchedule = {
  ageLabel: "12+ meses",
  totalSleepHours: 13,
  napCount: "1–2",
  nightSleepHours: 11,
};

export function getAgeSchedule(ageWeeks: number): AgeSchedule {
  for (const entry of SCHEDULES) {
    if (ageWeeks <= entry.maxWeeks) return entry.schedule;
  }
  return DEFAULT;
}
