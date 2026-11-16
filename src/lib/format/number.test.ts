import { describe, expect, it } from "vitest";
import { formatDecimal } from "./number";

describe("formatDecimal", () => {
  it("uses a comma as the decimal separator", () => {
    expect(formatDecimal(22.5)).toBe("22,5");
  });
  it("drops a zero fraction by default", () => {
    expect(formatDecimal(22)).toBe("22");
  });
  it("rounds to the given digits", () => {
    expect(formatDecimal(4.567)).toBe("4,6");
    expect(formatDecimal(4.567, 2)).toBe("4,57");
  });
  it("can keep a fixed number of digits (TOG 1,0)", () => {
    expect(formatDecimal(1, 1, { fixed: true })).toBe("1,0");
  });
});
