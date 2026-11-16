import { differenceInWeeks } from "date-fns";
import type { SleepSession } from "@/types";
import { getAgeSchedule } from "@/lib/sleep/schedules";
import { formatDuration } from "@/lib/utils";
import { buildCompleteDailySleepTotals } from "@/lib/sleep/sessionDayAllocation";
import { addDaysToKey, localDayKey, parseLocalDate } from "@/lib/dates/localDate";

/** Where and when the days are measured. */
export interface LocalDayOptions {
  /** IANA timezone of the family's days (default: this runtime's). */
  timeZone?: string;
  now?: Date;
}

function resolve(opts: LocalDayOptions): { timeZone: string; now: Date } {
  return {
    timeZone: opts.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    now: opts.now ?? new Date(),
  };
}

export interface SleepDebt {
  /** Recommended total sleep per day (hours) for the baby's age. */
  targetHours: number;
  /** Average total sleep per day over the analysed window (hours). */
  avgHours: number;
  /** Positive = sleeping less than recommended (a debt), in hours/day. */
  debtHours: number;
  /** Number of complete days analysed (with at least some sleep logged). */
  daysAnalyzed: number;
}

/**
 * Sleep debt = how far the recent daily average is below the age-appropriate
 * target, over the last `days` complete local days (today, still running, is
 * left out: at 07:00 it holds only the end of the night). Uses
 * {@link buildCompleteDailySleepTotals}, so night sleep crossing midnight is
 * split by day and a sleep still running counts up to now. Only counts days
 * that actually have data to avoid penalising gaps where the family simply
 * didn't log.
 */
export function computeSleepDebt(
  sessions: SleepSession[],
  ageWeeks: number,
  days: number = 7,
  opts: LocalDayOptions = {}
): SleepDebt {
  const { timeZone, now } = resolve(opts);
  const schedule = getAgeSchedule(ageWeeks);
  const totals = buildCompleteDailySleepTotals(sessions, days, timeZone, now);

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
 * The last `recentDays` complete local days are compared against the
 * equally-sized window before them. Today is never part of it: in the morning
 * it holds only the end of the night and would read as a drop.
 */
export function detectRegression(
  birthDateIso: string,
  sessions: SleepSession[],
  recentDays: number = 5,
  opts: LocalDayOptions = {}
): RegressionResult {
  const { timeZone, now } = resolve(opts);
  const ageWeeks = differenceInWeeks(now, parseLocalDate(birthDateIso));
  const ageWindow =
    REGRESSION_WINDOWS.find(
      (w) => ageWeeks >= w.minWeeks && ageWeeks <= w.maxWeeks
    ) ?? null;

  // Compare recent window vs the preceding window of equal length.
  const totals = buildCompleteDailySleepTotals(sessions, recentDays * 2, timeZone, now);
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

  // Night wake-ups per night: finished NIGHT_SLEEP segments per complete
  // local day, by the day each segment started on.
  const todayKey = localDayKey(now, timeZone);
  const nightWakes = (windowDays: number, offsetDays: number) => {
    const endKey = addDaysToKey(todayKey, -offsetDays); // exclusive
    const startKey = addDaysToKey(endKey, -windowDays);
    const nights = sessions.filter((s) => {
      if (s.type !== "NIGHT_SLEEP" || s.duration_min == null) return false;
      const key = localDayKey(new Date(s.start_time), timeZone);
      return key >= startKey && key < endKey;
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

  const dropText = `${formatDuration(sleepDropHours * 60)}/dia`;
  let summary: string;
  if (!enoughData) {
    summary = "Dados insuficientes para avaliar regressão.";
  } else if (detected && ageWindow) {
    summary = `${ageWindow.label} provável: ${
      hasSleepDrop ? `queda de ${dropText} no sono` : "sono mais fragmentado"
    }.`;
  } else if (detected) {
    summary = `Mudança no padrão: queda de ${dropText} no sono recente.`;
  } else if (ageWindow) {
    summary = `Fase de ${ageWindow.label} — padrão ainda estável.`;
  } else {
    summary = "Padrão de sono dentro do esperado.";
  }

  return { detected, ageWindow, sleepDropHours, wakeIncrease, summary };
}
