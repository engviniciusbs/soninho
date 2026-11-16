import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDuration, getBabyAge } from "./utils";

describe("formatDuration", () => {
  it.each([
    [0, "0 min"],
    [40, "40 min"],
    [59.6, "1h"],
    [90, "1h 30min"],
    [119.6, "2h"],
    [120, "2h"],
    [-5, "0 min"],
  ])("%s min → %s", (min, text) => {
    expect(formatDuration(min)).toBe(text);
  });
});

describe("getBabyAge", () => {
  const ORIGINAL_TZ = process.env.TZ;
  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = ORIGINAL_TZ;
  });

  // Born 2026-02-10. At 22:00 on 2026-03-09 (local) she is not 1 month old yet.
  // Parsing "2026-02-10" as UTC midnight puts the birth at 21:00 on 02-09 in
  // São Paulo and makes her one month old a day early.
  it.each(["UTC", "America/Sao_Paulo"])("uses the local birth day (TZ=%s)", (tz) => {
    process.env.TZ = tz;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 9, 22, 0));
    expect(getBabyAge("2026-02-10")).toEqual({ weeks: 3, months: 0 });
    vi.setSystemTime(new Date(2026, 2, 10, 0, 0));
    expect(getBabyAge("2026-02-10")).toEqual({ weeks: 4, months: 1 });
  });
});
