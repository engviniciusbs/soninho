import { describe, expect, it } from "vitest";
import { DAY_STATUS_LABEL, dayStatus } from "@/lib/sleep/dayStatus";

describe("dayStatus", () => {
  it("dia sem registro não tem status", () => {
    expect(dayStatus(0, 14)).toBeNull();
  });
  it.each([
    [Number.NaN, 14],
    [Number.POSITIVE_INFINITY, 14],
    [13 * 60, Number.NaN],
  ])("entrada não finita (%s min, meta %s h) não tem status", (min, target) => {
    expect(dayStatus(min, target)).toBeNull();
  });
  it.each([
    [13 * 60 + 1, "within"],
    [12 * 60 + 59, "below"],
    [15 * 60 + 1, "above"],
    [13 * 60, "within"],
    [15 * 60, "within"],
  ])("%i min com meta de 14h", (min, expected) => {
    expect(dayStatus(min, 14)).toBe(expected);
  });
  it("rótulos", () => {
    expect(DAY_STATUS_LABEL).toEqual({
      within: "Dentro do esperado",
      below: "Abaixo do esperado",
      above: "Acima do esperado",
    });
  });
});
