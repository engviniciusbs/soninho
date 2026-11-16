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

  it("agrees with the baby's sex: a girl is 'uma bebê', in the feminine", () => {
    const prompt = getSleepSystemPrompt("ctx", { weeks: 39, months: 9 }, "F");
    expect(prompt).toContain("uma bebê de 9 meses");
    expect(prompt).toMatch(/menina/);
  });

  it("a boy is 'um bebê', in the masculine", () => {
    const prompt = getSleepSystemPrompt("ctx", { weeks: 39, months: 9 }, "M");
    expect(prompt).toContain("um bebê de 9 meses");
    expect(prompt).toMatch(/menino/);
  });

  it("without sex, tells the AI not to assume one", () => {
    const prompt = getSleepSystemPrompt("ctx", { weeks: 39, months: 9 }, null);
    expect(prompt).toMatch(/não foi informado/);
    expect(prompt).not.toMatch(/uma bebê|é uma menina|é um menino/);
  });
});

