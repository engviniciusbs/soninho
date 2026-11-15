import { describe, expect, it } from "vitest";
import { computeFeedingSuggestion } from "@/lib/feeding/computeFeedingSuggestion";

const tz = "America/Sao_Paulo";

describe("computeFeedingSuggestion", () => {
  it("returns the empty branch when there is no history", () => {
    expect(
      computeFeedingSuggestion({
        ageWeeks: 8,
        recentFeedTimes: [],
        timezone: tz,
        now: new Date("2026-05-24T19:00:00Z"),
      })
    ).toEqual({
      suggestedTime: "",
      minutesUntilSuggested: 0,
      avgIntervalMinutes: null,
      confidence: "low",
      reasoning:
        "Sem mamadas registradas recentemente. Registre a próxima mamadeira ou mamada para começarmos a prever o intervalo.",
    });
  });

  it("predicts last feed + 180 min for four feeds every 3h", () => {
    // last feed 15:00 SP (18:00Z) -> next 18:00 SP; now 16:00 SP -> 120 min
    expect(
      computeFeedingSuggestion({
        ageWeeks: 8,
        recentFeedTimes: [
          "2026-05-24T18:00:00Z",
          "2026-05-24T15:00:00Z",
          "2026-05-24T12:00:00Z",
          "2026-05-24T09:00:00Z",
        ],
        timezone: tz,
        now: new Date("2026-05-24T19:00:00Z"),
      })
    ).toEqual({
      suggestedTime: "18:00",
      minutesUntilSuggested: 120,
      avgIntervalMinutes: 180,
      confidence: "high",
      reasoning:
        "Última mamada foi às 15:00. O intervalo médio das últimas mamadas é de ~3h, então a próxima deve ser por volta de 18:00.",
    });
  });

  it("gives medium confidence when gaps vary widely", () => {
    // gaps 60 and 240 -> avg 150, stddev 90 > 45
    const result = computeFeedingSuggestion({
      ageWeeks: 8,
      recentFeedTimes: [
        "2026-05-24T18:00:00Z",
        "2026-05-24T17:00:00Z",
        "2026-05-24T13:00:00Z",
      ],
      timezone: tz,
      now: new Date("2026-05-24T18:30:00Z"),
    });
    expect(result.confidence).toBe("medium");
    expect(result.avgIntervalMinutes).toBe(150);
    expect(result.suggestedTime).toBe("17:30");
    expect(result.minutesUntilSuggested).toBe(120);
  });

  it("falls back to the age interval with a single feed", () => {
    expect(
      computeFeedingSuggestion({
        ageWeeks: 8,
        recentFeedTimes: ["2026-05-24T18:00:00Z"],
        timezone: tz,
        now: new Date("2026-05-24T19:00:00Z"),
      })
    ).toEqual({
      suggestedTime: "18:00",
      minutesUntilSuggested: 120,
      avgIntervalMinutes: null,
      confidence: "low",
      reasoning:
        "Última mamada foi às 15:00. Ainda sem histórico suficiente — usando o intervalo típico da idade (~3h) para estimar 18:00.",
    });
  });

  it("ignores gaps outside (20min, 8h) and falls back", () => {
    const result = computeFeedingSuggestion({
      ageWeeks: 30,
      recentFeedTimes: [
        "2026-05-24T18:00:00Z",
        "2026-05-24T17:50:00Z",
        "2026-05-24T05:00:00Z",
      ],
      timezone: tz,
      now: new Date("2026-05-24T18:00:00Z"),
    });
    expect(result.avgIntervalMinutes).toBeNull();
    expect(result.confidence).toBe("low");
    expect(result.suggestedTime).toBe("19:00");
    expect(result.minutesUntilSuggested).toBe(240);
  });

  it("reports an overdue feed as 'Assim que possível' with 0 minutes", () => {
    expect(
      computeFeedingSuggestion({
        ageWeeks: 8,
        recentFeedTimes: [
          "2026-05-24T18:00:00Z",
          "2026-05-24T15:00:00Z",
          "2026-05-24T12:00:00Z",
        ],
        timezone: tz,
        now: new Date("2026-05-24T23:00:00Z"),
      })
    ).toEqual({
      suggestedTime: "Assim que possível",
      minutesUntilSuggested: 0,
      avgIntervalMinutes: 180,
      confidence: "high",
      reasoning:
        "Última mamada foi às 15:00. Com base no intervalo médio recente (~3h), já passou da hora — ofereça a próxima mamada.",
    });
  });

  it("reports overdue with the age fallback wording", () => {
    const result = computeFeedingSuggestion({
      ageWeeks: 8,
      recentFeedTimes: ["2026-05-24T18:00:00Z"],
      timezone: tz,
      now: new Date("2026-05-24T23:00:00Z"),
    });
    expect(result.suggestedTime).toBe("Assim que possível");
    expect(result.minutesUntilSuggested).toBe(0);
    expect(result.reasoning).toBe(
      "Última mamada foi às 15:00. Para a idade do bebê, o intervalo típico é de ~3h — já passou da hora."
    );
  });
});
