import { describe, expect, it } from "vitest";
import {
  classifyEndResult,
  classifyLiveSession,
  isCheckViolation,
  isUniqueViolation,
} from "./sessionConflict";

describe("isUniqueViolation", () => {
  it("is true for unique_violation (23505)", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });
  it.each([{ code: "23503" }, {}, null])("is false for %j", (e) => {
    expect(isUniqueViolation(e)).toBe(false);
  });
});

describe("isCheckViolation", () => {
  it("is true for check_violation (23514)", () => {
    expect(isCheckViolation({ code: "23514" })).toBe(true);
  });
  it.each([{ code: "23505" }, {}, null])("is false for %j", (e) => {
    expect(isCheckViolation(e)).toBe(false);
  });
});

describe("classifyLiveSession", () => {
  const row = { id: "S1", baby_id: "B1", end_time: null };

  it("keeps the timer on a network/RLS error", () => {
    expect(classifyLiveSession({ data: null, error: { message: "fetch failed" } }, "B1")).toBe(
      "unknown"
    );
  });
  it("is running while the row is open for that baby", () => {
    expect(classifyLiveSession({ data: row, error: null }, "B1")).toBe("running");
  });
  it("is ended when the row is gone without error", () => {
    expect(classifyLiveSession({ data: null, error: null }, "B1")).toBe("ended");
  });
  it("is ended when end_time is filled", () => {
    expect(
      classifyLiveSession({ data: { ...row, end_time: "2026-11-15T10:00:00Z" }, error: null }, "B1")
    ).toBe("ended");
  });
  it("is a mismatch when the session belongs to another baby", () => {
    expect(classifyLiveSession({ data: row, error: null }, "B2")).toBe("mismatch");
  });
});

describe("classifyEndResult", () => {
  it("is ok without error", () => {
    expect(classifyEndResult(null)).toBe("ok");
  });
  it("is already-ended when the guarded update matched 0 rows (PGRST116)", () => {
    expect(classifyEndResult({ code: "PGRST116" })).toBe("already-ended");
  });
  it("is check for check_violation (23514)", () => {
    expect(classifyEndResult({ code: "23514" })).toBe("check");
  });
  it.each([{ code: "42501" }, { code: "PGRST301" }, {}])("is error for %j", (e) => {
    expect(classifyEndResult(e)).toBe("error");
  });
});
