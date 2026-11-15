import { describe, expect, it } from "vitest";
import { clampEndTime } from "./sessionTime";

describe("clampEndTime", () => {
  const start = "2026-11-15T10:00:00.000Z";

  it("returns now when now is after the start", () => {
    expect(clampEndTime(start, new Date("2026-11-15T10:30:00.000Z"))).toBe(
      "2026-11-15T10:30:00.000Z"
    );
  });

  it("returns the start when this phone's clock is behind the one that started", () => {
    expect(clampEndTime(start, new Date("2026-11-15T09:59:40.000Z"))).toBe(start);
  });

  it("returns the start when now equals the start", () => {
    expect(clampEndTime(start, new Date(start))).toBe(start);
  });

  it("normalizes a start with an offset (as Postgres returns it)", () => {
    expect(clampEndTime("2026-11-15T07:00:00-03:00", new Date("2026-11-15T09:00:00.000Z"))).toBe(
      "2026-11-15T10:00:00.000Z"
    );
  });

  it("accepts epoch milliseconds for now", () => {
    expect(clampEndTime(start, Date.parse("2026-11-15T11:00:00.000Z"))).toBe(
      "2026-11-15T11:00:00.000Z"
    );
  });

  it("rounds a microsecond start UP so end >= start holds in Postgres", () => {
    // PostgREST returns timestamptz with microseconds; truncating to ms would
    // give an end 301µs BEFORE the start and the CHECK would still fail.
    expect(clampEndTime("2026-11-15T20:46:13.830301+00:00", new Date("2026-11-15T20:40:00.000Z"))).toBe(
      "2026-11-15T20:46:13.831Z"
    );
  });

  it("does not round an exact-millisecond microsecond start", () => {
    expect(clampEndTime("2026-11-15T20:46:13.830000+00:00", new Date("2026-11-15T20:40:00.000Z"))).toBe(
      "2026-11-15T20:46:13.830Z"
    );
  });

  it("falls back to now for an unparseable start", () => {
    expect(clampEndTime("garbage", new Date("2026-11-15T11:00:00.000Z"))).toBe(
      "2026-11-15T11:00:00.000Z"
    );
  });
});
