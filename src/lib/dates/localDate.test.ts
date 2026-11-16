import { afterAll, describe, expect, it } from "vitest";
import {
  addDaysToKey,
  formatLocalDate,
  localDayKey,
  parseLocalDate,
} from "./localDate";

// The server runs in UTC; the family's devices run in America/Sao_Paulo.
// Every case must hold in both process timezones.
const ORIGINAL_TZ = process.env.TZ;
afterAll(() => {
  process.env.TZ = ORIGINAL_TZ;
});

describe.each(["UTC", "America/Sao_Paulo"])("local dates (process TZ=%s)", (tz) => {
  const withTz = (fn: () => void) => () => {
    process.env.TZ = tz;
    fn();
  };

  it(
    "parseLocalDate returns local midnight of that day",
    withTz(() => {
      const d = parseLocalDate("2026-02-10");
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(1);
      expect(d.getDate()).toBe(10);
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
    })
  );

  it(
    "formatLocalDate keeps the birth day (no one-day-early shift)",
    withTz(() => {
      expect(formatLocalDate("2026-02-10", "dd/MM")).toBe("10/02");
      expect(formatLocalDate("2026-02-10")).toBe("10/02/2026");
    })
  );

  it(
    "localDayKey uses the given timezone, not the process one",
    withTz(() => {
      // 01:30 UTC on the 17th is 22:30 on the 16th in São Paulo.
      expect(localDayKey(new Date("2026-11-17T01:30:00Z"), "America/Sao_Paulo")).toBe("2026-11-16");
      expect(localDayKey(new Date("2026-11-17T01:30:00Z"), "UTC")).toBe("2026-11-17");
    })
  );

  it(
    "addDaysToKey does calendar arithmetic on yyyy-MM-dd keys",
    withTz(() => {
      expect(addDaysToKey("2026-02-28", 1)).toBe("2026-03-01");
      expect(addDaysToKey("2028-02-28", 1)).toBe("2028-02-29");
      expect(addDaysToKey("2026-01-01", -1)).toBe("2025-12-31");
      expect(addDaysToKey("2026-11-16", 0)).toBe("2026-11-16");
    })
  );
});
