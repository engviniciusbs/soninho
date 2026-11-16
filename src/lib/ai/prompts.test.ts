import { describe, expect, it } from "vitest";
import { getSleepSystemPrompt } from "./prompts";

describe("getSleepSystemPrompt", () => {
  it("uses the baby's real age, never 'recém-nascidos'", () => {
    const prompt = getSleepSystemPrompt("ctx", { weeks: 39, months: 9 });
    expect(prompt).not.toMatch(/recém-nascid/i);
    expect(prompt).toContain("9 meses");
  });

  it("says '1 mês' in the singular", () => {
    expect(getSleepSystemPrompt("ctx", { weeks: 5, months: 1 })).toContain("1 mês");
  });

  it("uses weeks before the first month", () => {
    expect(getSleepSystemPrompt("ctx", { weeks: 3, months: 0 })).toContain("3 semanas");
  });
});
