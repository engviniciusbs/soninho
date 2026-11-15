import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  REGRESSION_WINDOWS,
  computeSleepDebt,
  detectRegression,
} from "@/lib/sleep/regression";
import { makeSession } from "@/lib/sleep/__fixtures__/session";
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
    // 2 days with data (2h and 4h) + 5 empty days in the 7-day window.
    const sessions = [dayNap("2026-05-23", 2), dayNap("2026-05-24", 4)];
    expect(computeSleepDebt(sessions, 4, 7)).toEqual({
      targetHours: 16,
      avgHours: 3,
      debtHours: 13,
      daysAnalyzed: 2,
    });
  });

  it("uses the target for the given age", () => {
    const r = computeSleepDebt([dayNap("2026-05-24", 14)], 30, 7);
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
      [dayNap("2026-05-24", 8), dayNap("2026-05-24", 8)],
      30,
      7
    );
    expect(r).toMatchObject({ avgHours: 16, debtHours: -2 });
  });
});

describe("detectRegression", () => {
  // recentDays = 3 -> days 19-21 are "prior", 22-24 are "recent".
  const priorDays = ["2026-05-19", "2026-05-20", "2026-05-21"];
  const recentDays = ["2026-05-22", "2026-05-23", "2026-05-24"];
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

  it("window boundaries are inclusive (14 and 20 in, 13 and 21 out)", () => {
    expect(detectRegression(birthForAge(14), [], 3).ageWindow).not.toBeNull();
    expect(detectRegression(birthForAge(20), [], 3).ageWindow).not.toBeNull();
    expect(detectRegression(birthForAge(13), [], 3).ageWindow).toBeNull();
    expect(detectRegression(birthForAge(21), [], 3).ageWindow).toBeNull();
  });

  it("insufficient data -> not detected with explanatory summary", () => {
    const r = detectRegression(birthForAge(16), [dayNap("2026-05-24", 5)], 3);
    expect(r.detected).toBe(false);
    expect(r.summary).toBe("Dados insuficientes para avaliar regressão.");
  });

  it("more night wake-ups inside a window -> detected as fragmented sleep", () => {
    // Stable naps plus one short night per day in the recent 3 days.
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
