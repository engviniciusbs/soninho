import { describe, it, expect } from "vitest";
import { zTimeZone, zLimit, zIsoRange, zUuid } from "./common";

describe("zTimeZone", () => {
  it("accepts valid zones", () => {
    expect(zTimeZone.parse("America/Sao_Paulo")).toBe("America/Sao_Paulo");
    expect(zTimeZone.parse("UTC")).toBe("UTC");
  });
  it("rejects invalid zones", () => {
    expect(zTimeZone.safeParse("Mars/Base").success).toBe(false);
  });
  it("defaults when absent", () => {
    expect(zTimeZone.parse(undefined)).toBe("America/Sao_Paulo");
  });
});

describe("zLimit", () => {
  const l = zLimit(100, 20);
  it("defaults on NaN or absent", () => {
    expect(l.parse("abc")).toBe(20);
    expect(l.parse(undefined)).toBe(20);
    expect(l.parse(null)).toBe(20);
  });
  it("clamps to max and parses", () => {
    expect(l.parse("500")).toBe(100);
    expect(l.parse("5")).toBe(5);
  });
  it("uses default for values below 1", () => {
    expect(l.parse("0")).toBe(20);
    expect(l.parse("-3")).toBe(20);
  });
});

describe("zIsoRange", () => {
  it("rejects end before start", () => {
    const r = zIsoRange.safeParse({
      start_time: "2026-01-01T10:00:00Z",
      end_time: "2026-01-01T09:00:00Z",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("O fim não pode ser antes do início");
  });
  it("accepts equal/after and missing end", () => {
    expect(zIsoRange.safeParse({ start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T10:00:00Z" }).success).toBe(true);
    expect(zIsoRange.safeParse({ start_time: "2026-01-01T10:00:00Z" }).success).toBe(true);
  });
});

describe("zUuid", () => {
  it("validates uuids", () => {
    expect(zUuid.safeParse("nope").success).toBe(false);
    expect(zUuid.safeParse("123e4567-e89b-42d3-a456-426614174000").success).toBe(true);
  });
});
