import { describe, expect, it } from "vitest";
import { computeEnvironmentCorrelation } from "@/lib/sleep/environmentCorrelation";
import { makeSession } from "@/lib/sleep/__fixtures__/session";

/** Completed session lasting `min` minutes. */
function done(min: number, extra: Parameters<typeof makeSession>[0]) {
  const start = "2026-05-24T12:00:00Z";
  const end = new Date(new Date(start).getTime() + min * 60_000).toISOString();
  return makeSession({ start_time: start, end_time: end, ...extra });
}

describe("computeEnvironmentCorrelation", () => {
  it("returns empty buckets for no sessions", () => {
    expect(computeEnvironmentCorrelation([])).toEqual({
      temperature: [],
      sleepSackTog: [],
      weather: [],
      bestTemperature: null,
    });
  });

  it("ignores sessions that are not completed", () => {
    const open = makeSession({ room_temp_celsius: 21, quality: 5 });
    const result = computeEnvironmentCorrelation([open]);
    expect(result.temperature).toEqual([]);
  });

  it("groups temperatures into buckets and averages quality/duration", () => {
    const result = computeEnvironmentCorrelation([
      done(60, { room_temp_celsius: 21, quality: 4 }),
      done(120, { room_temp_celsius: 20, quality: 2 }),
      done(100, { room_temp_celsius: 25, quality: 5 }),
      done(120, { room_temp_celsius: 24, quality: 5 }),
      done(30, { room_temp_celsius: 17.9 }),
      makeSession({ room_temp_celsius: 21, quality: 1 }),
    ]);
    expect(result.temperature).toEqual([
      { label: "20–21°C", count: 2, avgQuality: 3, avgDurationMin: 90 },
      { label: "24–25°C", count: 2, avgQuality: 5, avgDurationMin: 110 },
      { label: "< 18°C", count: 1, avgQuality: null, avgDurationMin: 30 },
    ]);
    expect(result.bestTemperature).toEqual({
      label: "24–25°C",
      count: 2,
      avgQuality: 5,
      avgDurationMin: 110,
    });
  });

  it("buckets boundaries: 18 and 19.9 together, 26 is top bucket", () => {
    const result = computeEnvironmentCorrelation([
      done(60, { room_temp_celsius: 18 }),
      done(60, { room_temp_celsius: 19.9 }),
      done(60, { room_temp_celsius: 26 }),
    ]);
    expect(result.temperature.map((b) => [b.label, b.count])).toEqual([
      ["18–19°C", 2],
      ["≥ 26°C", 1],
    ]);
  });

  it("requires 2+ sessions with quality for bestTemperature", () => {
    const result = computeEnvironmentCorrelation([
      done(60, { room_temp_celsius: 21, quality: 5 }),
    ]);
    expect(result.bestTemperature).toBeNull();
  });

  it("groups by TOG and by translated weather label", () => {
    const result = computeEnvironmentCorrelation([
      done(60, { sleep_sack_tog: 1, weather_condition: "rainy", quality: 3 }),
      done(90, { sleep_sack_tog: 1, weather_condition: "rainy", quality: 4 }),
      done(45, { sleep_sack_tog: 2.5, weather_condition: "sunny" }),
    ]);
    expect(result.sleepSackTog).toEqual([
      { label: "TOG 1", count: 2, avgQuality: 3.5, avgDurationMin: 75 },
      { label: "TOG 2.5", count: 1, avgQuality: null, avgDurationMin: 45 },
    ]);
    expect(result.weather).toEqual([
      { label: "Chuvoso", count: 2, avgQuality: 3.5, avgDurationMin: 75 },
      { label: "Ensolarado", count: 1, avgQuality: null, avgDurationMin: 45 },
    ]);
  });
});
