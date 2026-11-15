import { describe, expect, it } from "vitest";
import {
  computeFeedingStats,
  hasFeedingData,
} from "@/lib/feeding/feedingStatistics";
import type {
  BottleFeeding,
  BreastfeedingSession,
  SolidFeeding,
} from "@/types";

const bottle = (volume_ml: number | null) => ({ volume_ml }) as BottleFeeding;
const breast = () => ({}) as BreastfeedingSession;
const solid = () => ({}) as SolidFeeding;

describe("computeFeedingStats", () => {
  it("computes daily averages over the period", () => {
    const stats = computeFeedingStats(
      [bottle(100), bottle(150), bottle(null), bottle(50)],
      [breast(), breast()],
      [solid()],
      2
    );
    expect(stats).toEqual({
      avgBottlesPerDay: 2,
      avgBottleVolumeMlPerDay: 150,
      avgBreastfeedsPerDay: 1,
      avgSolidMealsPerDay: 0.5,
    });
  });

  it("treats a zero period as one day", () => {
    const stats = computeFeedingStats([bottle(90)], [], [], 0);
    expect(stats.avgBottlesPerDay).toBe(1);
    expect(stats.avgBottleVolumeMlPerDay).toBe(90);
  });
});

describe("hasFeedingData", () => {
  it("is false when every average is zero", () => {
    expect(hasFeedingData(computeFeedingStats([], [], [], 7))).toBe(false);
  });

  it("is true when any average is positive", () => {
    expect(hasFeedingData(computeFeedingStats([bottle(60)], [], [], 7))).toBe(true);
    expect(hasFeedingData(computeFeedingStats([], [breast()], [], 7))).toBe(true);
    expect(hasFeedingData(computeFeedingStats([], [], [solid()], 7))).toBe(true);
  });
});
