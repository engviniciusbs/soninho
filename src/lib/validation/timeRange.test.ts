import { describe, it, expect } from "vitest";
import { isEndBeforeStart, isCheckViolation } from "./timeRange";

describe("timeRange", () => {
  it("detects end before start", () => {
    expect(isEndBeforeStart("2026-01-01T10:00:00Z", "2026-01-01T09:59:00Z")).toBe(true);
    expect(isEndBeforeStart("2026-01-01T10:00:00Z", "2026-01-01T10:00:00Z")).toBe(false);
    expect(isEndBeforeStart("2026-01-01T10:00:00Z", "garbage")).toBe(false);
  });
  it("detects 23514", () => {
    expect(isCheckViolation({ code: "23514" })).toBe(true);
    expect(isCheckViolation({ code: "42501" })).toBe(false);
    expect(isCheckViolation(null)).toBe(false);
  });
});
