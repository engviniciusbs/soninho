import { describe, expect, it } from "vitest";
import { getDefaultFeedingIntervalMinutes } from "@/lib/feeding/feedingIntervals";

describe("getDefaultFeedingIntervalMinutes", () => {
  it.each([
    [2, 150],
    [4, 150],
    [5, 180],
    [12, 180],
    [20, 210],
    [26, 210],
    [40, 240],
    [52, 240],
    [60, 270],
  ])("age %i weeks -> %i minutes", (weeks, minutes) => {
    expect(getDefaultFeedingIntervalMinutes(weeks)).toBe(minutes);
  });
});
