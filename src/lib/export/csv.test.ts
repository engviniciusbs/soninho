import { describe, expect, it } from "vitest";
import { toCsv, toCsvCell } from "./csv";

describe("toCsvCell", () => {
  it("neutralizes formula prefixes", () => {
    expect(toCsvCell("=1+1")).toBe("'=1+1");
    expect(toCsvCell("-2")).toBe("'-2");
    expect(toCsvCell("+1")).toBe("'+1");
    expect(toCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(toCsvCell("\tx")).toBe("'\tx");
  });
  it("quotes special characters", () => {
    expect(toCsvCell("a,b")).toBe('"a,b"');
    expect(toCsvCell("a;b")).toBe('"a;b"');
    expect(toCsvCell("a\nb")).toBe('"a\nb"');
    expect(toCsvCell('diz "oi"')).toBe('"diz ""oi"""');
  });
  it("handles null and numbers", () => {
    expect(toCsvCell(null)).toBe("");
    expect(toCsvCell(undefined)).toBe("");
    expect(toCsvCell(42)).toBe("42");
  });
});

describe("toCsv", () => {
  it("joins rows with commas and newlines", () => {
    expect(toCsv([["a", "b,c"], [1, "=x"]])).toBe('a,"b,c"\n1,\'=x');
  });
});
