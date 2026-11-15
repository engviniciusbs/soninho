import { describe, it, expect } from "vitest";
import {
  regressionAiKey,
  shouldRequestRegressionAi,
  markRegressionAiRequested,
} from "./regressionAiGate";

function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

describe("regressionAiGate", () => {
  const day = new Date(2026, 10, 5, 9, 0);
  it("builds a per baby/day key", () => {
    expect(regressionAiKey("b1", day)).toBe("soninho-regression-ai:b1:2026-11-05");
  });
  it("requests once per day then skips", () => {
    const s = memStorage();
    expect(shouldRequestRegressionAi("b1", day, s)).toBe(true);
    markRegressionAiRequested("b1", day, s);
    expect(shouldRequestRegressionAi("b1", day, s)).toBe(false);
    expect(shouldRequestRegressionAi("b2", day, s)).toBe(true);
    expect(shouldRequestRegressionAi("b1", new Date(2026, 10, 6), s)).toBe(true);
  });
  it("tolerates throwing or missing storage", () => {
    const bad = {
      getItem: () => {
        throw new Error("x");
      },
      setItem: () => {
        throw new Error("x");
      },
    };
    expect(shouldRequestRegressionAi("b1", day, bad)).toBe(true);
    expect(() => markRegressionAiRequested("b1", day, bad)).not.toThrow();
    expect(shouldRequestRegressionAi("b1", day, null)).toBe(true);
  });
});
