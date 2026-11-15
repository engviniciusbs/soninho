import { describe, expect, it } from "vitest";
import {
  getMinutesUntilNextNap,
  getWakeWindowRange,
  getWakeWindowStatus,
} from "@/lib/sleep/wakeWindows";

describe("getWakeWindowRange", () => {
  it.each([
    [4, 45, 60],
    [7, 60, 75],
    [10, 75, 90],
    [14, 90, 120],
    [18, 105, 135],
    [22, 120, 150],
    [26, 150, 180],
    [30, 165, 210],
    [40, 180, 240],
    [80, 180, 240],
  ])("age %i weeks -> %i-%i min", (weeks, minMinutes, maxMinutes) => {
    expect(getWakeWindowRange(weeks)).toMatchObject({ minMinutes, maxMinutes });
  });

  it("boundary 6 weeks stays in the 0-6 weeks band", () => {
    expect(getWakeWindowRange(6)).toMatchObject({
      minMinutes: 45,
      maxMinutes: 60,
      label: "0–6 semanas",
    });
    expect(getWakeWindowRange(7).label).toBe("6–8 semanas");
  });

  it("boundary 52 weeks stays in the 9-12 months band", () => {
    expect(getWakeWindowRange(52)).toMatchObject({
      minMinutes: 180,
      maxMinutes: 240,
      label: "9–12 meses",
    });
  });
});

describe("getWakeWindowStatus", () => {
  const range = { minMinutes: 60, maxMinutes: 90, label: "x" };

  it("is green up to max-15 inclusive", () => {
    expect(getWakeWindowStatus(0, range)).toBe("green");
    expect(getWakeWindowStatus(75, range)).toBe("green");
  });

  it("is yellow between max-15 (exclusive) and max (inclusive)", () => {
    expect(getWakeWindowStatus(76, range)).toBe("yellow");
    expect(getWakeWindowStatus(90, range)).toBe("yellow");
  });

  it("is red above max", () => {
    expect(getWakeWindowStatus(91, range)).toBe("red");
  });
});

describe("getMinutesUntilNextNap", () => {
  const range = { minMinutes: 60, maxMinutes: 90, label: "x" };

  it("returns remaining minutes to max", () => {
    expect(getMinutesUntilNextNap(30, range)).toBe(60);
    expect(getMinutesUntilNextNap(90, range)).toBe(0);
  });

  it("never goes negative", () => {
    expect(getMinutesUntilNextNap(200, range)).toBe(0);
  });
});
