import { differenceInWeeks } from "date-fns";
import type { SleepSession } from "@/types";
import { getAgeSchedule } from "@/lib/sleep/schedules";
import { buildDailySleepTotals } from "@/lib/sleep/sessionDayAllocation";

export interface SleepDebt {
  /** Recommended total sleep per day (hours) for the baby's age. */
  targetHours: number;
  /** Average total sleep per day over the analysed window (hours). */
  avgHours: number;
  /** Positive = sleeping less than recommended (a debt), in hours/day. */
  debtHours: number;
  /** Number of full days analysed (with at least some sleep logged). */
  daysAnalyzed: number;
}

/**
 * Sleep debt = how far the recent daily average is below the age-appropriate
 * target. Uses {@link buildDailySleepTotals} so night sleep crossing midnight
 * is allocated correctly. Only counts days that actually have data to avoid
 * penalising gaps where the family simply didn't log.
 */
export function computeSleepDebt(
  sessions: SleepSession[],
  ageWeeks: number,
  days: number = 7
): SleepDebt {
  const schedule = getAgeSchedule(ageWeeks);
  const totals = buildDailySleepTotals(sessions, days);

  const daysWithData = totals.filter((d) => d.totalHours > 0);
  const avgHours =
    daysWithData.length > 0
      ? daysWithData.reduce((a, d) => a + d.totalHours, 0) / daysWithData.length
      : 0;

  const debtHours = parseFloat((schedule.totalSleepHours - avgHours).toFixed(1));

  return {
    targetHours: schedule.totalSleepHours,
    avgHours: parseFloat(avgHours.toFixed(1)),
    debtHours,
    daysAnalyzed: daysWithData.length,
  };
}

export interface RegressionWindow {
  label: string;
  /** Inclusive age range in weeks. */
  minWeeks: number;
  maxWeeks: number;
}

/** Common sleep regression windows (approximate, in weeks). */
export const REGRESSION_WINDOWS: RegressionWindow[] = [
  { label: "Regressão dos 4 meses", minWeeks: 14, maxWeeks: 20 },
  { label: "Regressão dos 8–10 meses", minWeeks: 32, maxWeeks: 44 },
  { label: "Regressão dos 12 meses", minWeeks: 50, maxWeeks: 56 },
  { label: "Regressão dos 18 meses", minWeeks: 74, maxWeeks: 82 },
];

export interface RegressionResult {
  /** True when there is meaningful evidence of a regression right now. */
  detected: boolean;
  /** The age-based regression window the baby is currently in, if any. */
  ageWindow: RegressionWindow | null;
  /** Drop in average daily sleep (hours) vs the prior period. */
  sleepDropHours: number;
  /** Increase in nightly wake-ups (count per night) vs the prior period. */
  wakeIncrease: number;
  /** Short human-readable status. */
  summary: string;
}

/**
 * Detects a likely regression by combining two signals:
 *  1. The baby's current age falls inside a known regression window.
 *  2. A measurable recent drop in total sleep AND/OR rise in night wake-ups
 *     compared with the preceding period.
 *
 * `recentDays` is compared against the equally-sized window before it.
 */
export function detectRegression(
  birthDateIso: string,
  sessions: SleepSession[],
  recentDays: number = 5
): RegressionResult {
  const ageWeeks = differenceInWeeks(new Date(), new Date(birthDateIso));
  const ageWindow =
    REGRESSION_WINDOWS.find(
      (w) => ageWeeks >= w.minWeeks && ageWeeks <= w.maxWeeks
    ) ?? null;

  // Compare recent window vs the preceding window of equal length.
  const totals = buildDailySleepTotals(sessions, recentDays * 2);
  const prior = totals.slice(0, recentDays);
  const recent = totals.slice(recentDays);

  const avg = (arr: { totalHours: number }[]) => {
    const withData = arr.filter((d) => d.totalHours > 0);
    return withData.length > 0
      ? withData.reduce((a, d) => a + d.totalHours, 0) / withData.length
      : 0;
  };

  const priorAvg = avg(prior);
  const recentAvg = avg(recent);
  const sleepDropHours =
    priorAvg > 0 ? parseFloat((priorAvg - recentAvg).toFixed(1)) : 0;

  // Night wake-ups per night (number of NIGHT_SLEEP segments / nights).
  const nightWakes = (windowDays: number, offsetDays: number) => {
    const now = new Date();
    const end = new Date(now.getTime() - offsetDays * 86_400_000);
    const start = new Date(end.getTime() - windowDays * 86_400_000);
    const nights = sessions.filter((s) => {
      if (s.type !== "NIGHT_SLEEP" || s.duration_min == null) return false;
      const t = new Date(s.start_time);
      return t >= start && t < end;
    }).length;
    return nights / windowDays;
  };

  const recentWakes = nightWakes(recentDays, 0);
  const priorWakes = nightWakes(recentDays, recentDays);
  const wakeIncrease = parseFloat((recentWakes - priorWakes).toFixed(1));

  const hasSleepDrop = sleepDropHours >= 1; // ≥1h/day less
  const hasMoreWakes = wakeIncrease >= 0.8; // noticeably more fragmented
  const hasSignal = hasSleepDrop || hasMoreWakes;

  // Require enough data to be confident.
  const enoughData = recent.filter((d) => d.totalHours > 0).length >= 2;

  const detected = enoughData && hasSignal && (ageWindow != null || hasSleepDrop);

  let summary: string;
  if (!enoughData) {
    summary = "Dados insuficientes para avaliar regressão.";
  } else if (detected && ageWindow) {
    summary = `${ageWindow.label} provável: ${
      hasSleepDrop ? `queda de ${sleepDropHours}h/dia no sono` : "sono mais fragmentado"
    }.`;
  } else if (detected) {
    summary = `Mudança no padrão: queda de ${sleepDropHours}h/dia no sono recente.`;
  } else if (ageWindow) {
    summary = `Fase de ${ageWindow.label} — padrão ainda estável.`;
  } else {
    summary = "Padrão de sono dentro do esperado.";
  }

  return { detected, ageWindow, sleepDropHours, wakeIncrease, summary };
}
