import { describe, expect, it } from "vitest";
import { feedingExplanation } from "@/lib/feeding/suggestionExplanation";
import type { FeedingSuggestion } from "@/types";

const base: FeedingSuggestion = {
  suggestedTime: "14:00",
  minutesUntilSuggested: 30,
  avgIntervalMinutes: 180,
  confidence: "high",
  reasoning: "x",
};

describe("feedingExplanation", () => {
  it("histórico", () => {
    expect(feedingExplanation(base)).toBe("Pelo intervalo das últimas mamadas");
  });
  it("faixa da idade", () => {
    expect(feedingExplanation({ ...base, avgIntervalMinutes: null, confidence: "low" })).toBe(
      "Pela faixa esperada para a idade",
    );
  });
  it("nunca contém ponto médio", () => {
    expect(feedingExplanation(base)).not.toContain("·");
    expect(feedingExplanation({ ...base, avgIntervalMinutes: null })).not.toContain("·");
  });
});
