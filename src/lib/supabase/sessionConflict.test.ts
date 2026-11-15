import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "./sessionConflict";

describe("isUniqueViolation", () => {
  it("is true for unique_violation (23505)", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });
  it.each([{ code: "23503" }, {}, null])("is false for %j", (e) => {
    expect(isUniqueViolation(e)).toBe(false);
  });
});
