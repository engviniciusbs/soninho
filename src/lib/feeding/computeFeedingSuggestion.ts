import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { getDefaultFeedingIntervalMinutes } from "@/lib/feeding/feedingIntervals";
import type { FeedingSuggestion } from "@/types";

function average(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdDev(nums: number[], mean: number): number {
  if (nums.length < 2) return 0;
  const variance = average(nums.map((n) => (n - mean) ** 2));
  return Math.sqrt(variance);
}

/**
 * Predicts the next milk feed (bottle or breast) from the average interval
 * between recent feeds. Falls back to an age-based typical interval when
 * there isn't enough history. No LLM — same deterministic approach as
 * {@link import("@/lib/sleep/computeNapSuggestion").computeNapSuggestion}.
 */
export function computeFeedingSuggestion(params: {
  ageWeeks: number;
  /** Most-recent-first ISO timestamps of milk feed end/log times. */
  recentFeedTimes: string[];
  timezone: string;
  now?: Date;
}): FeedingSuggestion {
  const now = params.now ?? new Date();
  const tz = params.timezone;

  if (params.recentFeedTimes.length === 0) {
    return {
      suggestedTime: "",
      minutesUntilSuggested: 0,
      avgIntervalMinutes: null,
      confidence: "low",
      reasoning:
        "Sem mamadas registradas recentemente. Registre a próxima mamadeira ou mamada para começarmos a prever o intervalo.",
    };
  }

  const lastFeed = new Date(params.recentFeedTimes[0]);
  const lastFeedClock = formatInTimeZone(lastFeed, tz, "HH:mm");

  const gaps: number[] = [];
  for (let i = 0; i < params.recentFeedTimes.length - 1; i++) {
    const a = new Date(params.recentFeedTimes[i]).getTime();
    const b = new Date(params.recentFeedTimes[i + 1]).getTime();
    const gapMin = (a - b) / 60000;
    if (gapMin > 20 && gapMin < 8 * 60) gaps.push(gapMin);
  }

  let avgIntervalMinutes: number;
  let confidence: FeedingSuggestion["confidence"];
  let usedHistory: boolean;

  if (gaps.length >= 2) {
    avgIntervalMinutes = Math.round(average(gaps));
    const variance = stdDev(gaps, avgIntervalMinutes);
    confidence = variance <= 45 ? "high" : "medium";
    usedHistory = true;
  } else {
    avgIntervalMinutes = getDefaultFeedingIntervalMinutes(params.ageWeeks);
    confidence = "low";
    usedHistory = false;
  }

  const nextFeedAt = addMinutes(lastFeed, avgIntervalMinutes);
  const overdue = now.getTime() > nextFeedAt.getTime();
  const suggestedTime = overdue
    ? "Assim que possível"
    : formatInTimeZone(nextFeedAt, tz, "HH:mm");
  const minutesUntilSuggested = overdue
    ? 0
    : Math.round((nextFeedAt.getTime() - now.getTime()) / 60000);

  const intervalLabel = `${Math.round(avgIntervalMinutes / 60 * 10) / 10}h`;
  const reasoning = overdue
    ? `Última mamada foi às ${lastFeedClock}. ${
        usedHistory
          ? `Com base no intervalo médio recente (~${intervalLabel}), já passou da hora — ofereça a próxima mamada.`
          : `Para a idade do bebê, o intervalo típico é de ~${intervalLabel} — já passou da hora.`
      }`
    : usedHistory
      ? `Última mamada foi às ${lastFeedClock}. O intervalo médio das últimas mamadas é de ~${intervalLabel}, então a próxima deve ser por volta de ${suggestedTime}.`
      : `Última mamada foi às ${lastFeedClock}. Ainda sem histórico suficiente — usando o intervalo típico da idade (~${intervalLabel}) para estimar ${suggestedTime}.`;

  return {
    suggestedTime,
    minutesUntilSuggested,
    avgIntervalMinutes: usedHistory ? avgIntervalMinutes : null,
    confidence,
    reasoning,
  };
}
