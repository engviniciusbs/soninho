import type { BottleFeeding, BreastfeedingSession, SolidFeeding } from "@/types";

export interface FeedingPeriodStats {
  avgBottlesPerDay: number;
  avgBottleVolumeMlPerDay: number;
  avgBreastfeedsPerDay: number;
  avgSolidMealsPerDay: number;
}

/** Aggregates feeding counts/volumes over a period into daily averages. */
export function computeFeedingStats(
  bottles: BottleFeeding[],
  breastSessions: BreastfeedingSession[],
  solids: SolidFeeding[],
  periodDays: number
): FeedingPeriodStats {
  const denom = periodDays || 1;

  const totalVolume = bottles.reduce((sum, b) => sum + (b.volume_ml ?? 0), 0);

  return {
    avgBottlesPerDay: bottles.length / denom,
    avgBottleVolumeMlPerDay: totalVolume / denom,
    avgBreastfeedsPerDay: breastSessions.length / denom,
    avgSolidMealsPerDay: solids.length / denom,
  };
}

export function hasFeedingData(stats: FeedingPeriodStats): boolean {
  return (
    stats.avgBottlesPerDay > 0 ||
    stats.avgBreastfeedsPerDay > 0 ||
    stats.avgSolidMealsPerDay > 0
  );
}
