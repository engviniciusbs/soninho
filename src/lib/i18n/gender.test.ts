import { describe, expect, it } from "vitest";
import { g } from "./gender";

const forms = { f: "acordada", m: "acordado", n: "desperto" };

describe("g", () => {
  it("picks the feminine form for 'F'", () => {
    expect(g("F", forms)).toBe("acordada");
  });
  it("picks the masculine form for 'M'", () => {
    expect(g("M", forms)).toBe("acordado");
  });
  it.each([null, undefined])("falls back to the neutral form for %s", (sex) => {
    expect(g(sex, forms)).toBe("desperto");
  });
  it("treats an unexpected stored value as unknown (neutral)", () => {
    expect(g("X" as never, forms)).toBe("desperto");
  });
});
