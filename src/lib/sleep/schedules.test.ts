import { describe, expect, it } from "vitest";
import { getAgeSchedule } from "@/lib/sleep/schedules";

describe("getAgeSchedule", () => {
  it.each([
    [4, "0–6 semanas", 16, "4–6", 8],
    [6, "0–6 semanas", 16, "4–6", 8],
    [7, "2–3 meses", 15, "3–5", 9],
    [12, "2–3 meses", 15, "3–5", 9],
    [16, "4–5 meses", 14.5, "3–4", 10],
    [24, "6–7 meses", 14, "2–3", 11],
    [30, "7–9 meses", 14, "2", 11],
    [40, "9–12 meses", 13.5, "2", 11],
    [52, "9–12 meses", 13.5, "2", 11],
    [53, "12+ meses", 13, "1–2", 11],
    [200, "12+ meses", 13, "1–2", 11],
  ])(
    "age %i weeks -> %s",
    (weeks, ageLabel, totalSleepHours, napCount, nightSleepHours) => {
      expect(getAgeSchedule(weeks)).toEqual({
        ageLabel,
        totalSleepHours,
        napCount,
        nightSleepHours,
      });
    }
  );
});
