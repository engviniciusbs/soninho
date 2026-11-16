import { describe, expect, it } from "vitest";
import { buildRegressionMessages } from "./regressionPrompt";

const input = {
  ageWeeks: 39,
  ageMonths: 9,
  ageWindowLabel: "Regressão dos 8-10 meses",
  sleepDropHours: 1.5,
  wakeIncrease: 0,
  targetHours: 14,
  avgHours: 12.5,
};

const text = (sex: "F" | "M" | null) =>
  buildRegressionMessages({ ...input, sex })
    .map((m) => m.content)
    .join("\n");

describe("buildRegressionMessages", () => {
  it("states the sex and asks for the feminine for a girl", () => {
    const t = text("F");
    expect(t).toContain("Sexo: menina");
    expect(t).toMatch(/feminino/);
  });

  it("states the sex and asks for the masculine for a boy", () => {
    const t = text("M");
    expect(t).toContain("Sexo: menino");
    expect(t).toMatch(/masculino/);
  });

  it("without sex, tells the AI not to assume one", () => {
    const t = text(null);
    expect(t).toContain("Sexo: não informado");
    expect(t).toMatch(/não presuma/);
    expect(t).not.toMatch(/feminino|masculino/);
  });

  it("keeps the regression context", () => {
    const t = text(null);
    expect(t).toContain("Idade do bebê: 39 semanas (9 meses).");
    expect(t).toContain("Está na fase de Regressão dos 8-10 meses.");
  });
});
