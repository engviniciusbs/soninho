import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  REGRESSION_WINDOWS,
  computeSleepDebt,
  detectRegression,
} from "@/lib/sleep/regression";
import { makeSession } from "@/lib/sleep/__fixtures__/session";
import { SP, regularBaby, spAt } from "@/lib/sleep/__fixtures__/regularBaby";
import { buildCompleteDailySleepTotals } from "@/lib/sleep/sessionDayAllocation";
import type { SleepSession } from "@/types";

const NOW = new Date("2026-05-24T15:00:00Z"); // 12:00 local

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

/** A single same-day sleep starting 10:00 local on `day` (yyyy-MM-dd) lasting `hours`. */
function dayNap(day: string, hours: number): SleepSession {
  const start = new Date(`${day}T13:00:00Z`);
  return makeSession({
    type: "NAP",
    start_time: start.toISOString(),
    end_time: new Date(start.getTime() + hours * 3_600_000).toISOString(),
  });
}

function birthForAge(weeks: number): string {
  return new Date(NOW.getTime() - weeks * 7 * 86_400_000).toISOString();
}

describe("computeSleepDebt", () => {
  it("averages only days with data and compares with the age target", () => {
    // 2 days with data (2h and 4h) + 5 empty days in the 7 complete days
    // before today (24/05, still running, is never counted).
    const sessions = [dayNap("2026-05-22", 2), dayNap("2026-05-23", 4)];
    expect(computeSleepDebt(sessions, 4, 7)).toEqual({
      targetHours: 16,
      avgHours: 3,
      debtHours: 13,
      daysAnalyzed: 2,
    });
  });

  it("uses the target for the given age", () => {
    const r = computeSleepDebt([dayNap("2026-05-23", 14)], 30, 7);
    expect(r).toEqual({
      targetHours: 14,
      avgHours: 14,
      debtHours: 0,
      daysAnalyzed: 1,
    });
  });

  it("with no data: avg 0 and debt equals target", () => {
    expect(computeSleepDebt([], 4)).toEqual({
      targetHours: 16,
      avgHours: 0,
      debtHours: 16,
      daysAnalyzed: 0,
    });
  });

  it("negative debt when sleeping more than the target", () => {
    const r = computeSleepDebt(
      [dayNap("2026-05-23", 8), dayNap("2026-05-23", 8)],
      30,
      7
    );
    expect(r).toMatchObject({ avgHours: 16, debtHours: -2 });
  });
});

describe("detectRegression", () => {
  // recentDays = 3 -> complete days 18-20 are "prior", 21-23 are "recent"
  // (today, 24/05, is still running and never counted).
  const priorDays = ["2026-05-18", "2026-05-19", "2026-05-20"];
  const recentDays = ["2026-05-21", "2026-05-22", "2026-05-23"];
  const dropping = [
    ...priorDays.map((d) => dayNap(d, 10)),
    ...recentDays.map((d) => dayNap(d, 5)),
  ];
  const stable = [
    ...priorDays.map((d) => dayNap(d, 10)),
    ...recentDays.map((d) => dayNap(d, 10)),
  ];

  it("exposes the known windows", () => {
    expect(REGRESSION_WINDOWS.map((w) => [w.minWeeks, w.maxWeeks])).toEqual([
      [14, 20],
      [32, 44],
      [50, 56],
      [74, 82],
    ]);
  });

  it("inside a window with a sleep drop -> detected", () => {
    const r = detectRegression(birthForAge(16), dropping, 3);
    expect(r.detected).toBe(true);
    expect(r.ageWindow).toMatchObject({ label: "Regressão dos 4 meses" });
    expect(r.sleepDropHours).toBe(5);
    expect(r.wakeIncrease).toBe(0);
    expect(r.summary).toBe("Regressão dos 4 meses provável: queda de 5h/dia no sono.");
  });

  it("inside a window but stable -> not detected", () => {
    const r = detectRegression(birthForAge(16), stable, 3);
    expect(r).toMatchObject({
      detected: false,
      sleepDropHours: 0,
      summary: "Fase de Regressão dos 4 meses — padrão ainda estável.",
    });
    expect(r.ageWindow?.label).toBe("Regressão dos 4 meses");
  });

  it("outside any window and stable -> not detected, no ageWindow", () => {
    const r = detectRegression(birthForAge(25), stable, 3);
    expect(r).toMatchObject({
      detected: false,
      ageWindow: null,
      summary: "Padrão de sono dentro do esperado.",
    });
  });

  it("outside a window, a >=1h drop alone still counts as detected", () => {
    const r = detectRegression(birthForAge(25), dropping, 3);
    expect(r.detected).toBe(true);
    expect(r.ageWindow).toBeNull();
    expect(r.summary).toBe("Mudança no padrão: queda de 5h/dia no sono recente.");
  });

  it("a fractional drop reads as a duration (1h 30min), never 1.5h", () => {
    const partial = [
      ...priorDays.map((d) => dayNap(d, 10)),
      ...recentDays.map((d) => dayNap(d, 8.5)),
    ];
    const r = detectRegression(birthForAge(25), partial, 3);
    expect(r.sleepDropHours).toBe(1.5);
    expect(r.summary).toBe("Mudança no padrão: queda de 1h 30min/dia no sono recente.");
  });

  it("window boundaries are inclusive (14 and 20 in, 13 and 21 out)", () => {
    expect(detectRegression(birthForAge(14), [], 3).ageWindow).not.toBeNull();
    expect(detectRegression(birthForAge(20), [], 3).ageWindow).not.toBeNull();
    expect(detectRegression(birthForAge(13), [], 3).ageWindow).toBeNull();
    expect(detectRegression(birthForAge(21), [], 3).ageWindow).toBeNull();
  });

  it("insufficient data -> not detected with explanatory summary", () => {
    const r = detectRegression(birthForAge(16), [dayNap("2026-05-23", 5)], 3);
    expect(r.detected).toBe(false);
    expect(r.summary).toBe("Dados insuficientes para avaliar regressão.");
  });

  it("more night wake-ups inside a window -> detected as fragmented sleep", () => {
    // Stable naps plus one short night per day in the recent 3 days
    // (02:00Z is 23:00 local of the day before: 21, 22 and 23/05).
    const nights = ["2026-05-22", "2026-05-23", "2026-05-24"].map((d) =>
      makeSession({
        type: "NIGHT_SLEEP",
        start_time: `${d}T02:00:00Z`,
        end_time: `${d}T03:00:00Z`,
      })
    );
    const r = detectRegression(birthForAge(16), [...stable, ...nights], 3);
    expect(r.wakeIncrease).toBe(1);
    expect(r.detected).toBe(true);
    expect(r.summary).toBe("Regressão dos 4 meses provável: sono mais fragmentado.");
  });
});

describe("honest numbers: complete local days and running sleep", () => {
  // 40 weeks old: inside "Regressão dos 8–10 meses", age target 13,5 h/day.
  const BIRTH = "2026-02-09";
  const AGE_WEEKS = 40;

  it("a regular baby at 07:00 is not a regression and has no debt", () => {
    const now = spAt("2026-11-16", "07:00");
    vi.setSystemTime(now);
    const sessions = regularBaby("2026-11-16", 14);
    const r = detectRegression(BIRTH, sessions, 5, { timeZone: SP, now });
    expect(r.detected).toBe(false);
    expect(r.sleepDropHours).toBe(0);
    const debt = computeSleepDebt(sessions, AGE_WEEKS, 7, { timeZone: SP, now });
    expect(Math.abs(debt.debtHours * 60)).toBeLessThan(30);
    expect(debt.avgHours).toBe(13.5);
  });

  it("at 22:30 in São Paulo (01:30 UTC) today is the local day, left out", () => {
    const now = new Date("2026-11-17T01:30:00Z"); // 16/11 22:30 local
    vi.setSystemTime(now);
    const sessions = regularBaby("2026-11-16", 14, { todayNaps: true, runningSince: "18:30" });
    expect(detectRegression(BIRTH, sessions, 5, { timeZone: SP, now }).detected).toBe(false);
    const debt = computeSleepDebt(sessions, AGE_WEEKS, 7, { timeZone: SP, now });
    expect(debt).toMatchObject({ avgHours: 13.5, daysAnalyzed: 7 });
  });

  it("a night still running fills the complete day it started on", () => {
    // Night from 15/11 18:30 not yet ended at 16/11 05:00: 15/11 still gets 5,5 h of it.
    const now = spAt("2026-11-16", "05:00");
    vi.setSystemTime(now);
    const sessions = regularBaby("2026-11-15", 14, { todayNaps: true, runningSince: "18:30" });
    const debt = computeSleepDebt(sessions, AGE_WEEKS, 7, { timeZone: SP, now });
    expect(debt.avgHours).toBe(13.5);
  });
});

describe("buildCompleteDailySleepTotals", () => {
  it("lists only complete local days in the given timezone", () => {
    const now = new Date("2026-11-17T01:30:00Z"); // 16/11 22:30 in São Paulo
    const sessions = regularBaby("2026-11-16", 5, { todayNaps: true, runningSince: "18:30" });
    const totals = buildCompleteDailySleepTotals(sessions, 3, SP, now);
    expect(totals.map((d) => [d.date, d.totalHours])).toEqual([
      ["13/11", 13.5],
      ["14/11", 13.5],
      ["15/11", 13.5],
    ]);
  });
});
