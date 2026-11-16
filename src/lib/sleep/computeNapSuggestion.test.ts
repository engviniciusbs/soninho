import { describe, expect, it } from "vitest";
import { computeNapSuggestion } from "@/lib/sleep/computeNapSuggestion";
import { makeSession } from "@/lib/sleep/__fixtures__/session";

const tz = "America/Sao_Paulo";
// Exactly 10 weeks before 2026-05-24.
const birthDateIso = "2026-03-15T12:00:00Z";

function nights(count: number) {
  return Array.from({ length: count }, (_, i) =>
    makeSession({
      type: "NIGHT_SLEEP",
      start_time: `2026-05-${String(20 + i).padStart(2, "0")}T22:00:00Z`, // 19:00 local
      end_time: `2026-05-${String(21 + i).padStart(2, "0")}T09:00:00Z`,
    })
  );
}

describe("computeNapSuggestion", () => {
  it("10-week-old, last sleep ended 09:00, now 09:30 -> NAP in a 75-90 min window", () => {
    const r = computeNapSuggestion({
      birthDateIso,
      lastSleepEndIso: "2026-05-24T12:00:00Z", // 09:00 local
      timezone: tz,
      now: new Date("2026-05-24T12:30:00Z"), // 09:30 local
    });
    expect(r).toMatchObject({
      kind: "NAP",
      windowStart: "10:15",
      windowEnd: "10:30",
      suggestedNapTime: "10:25", // midpoint 82.5 -> 83 min -> 10:23 -> rounded to 5 min
      confidence: "high",
      minutesUntilSuggested: 55,
    });
    expect(r.reasoning).toContain("Último sono terminou às 09:00");
    expect(r.reasoning).toContain("2 meses");
  });

  it("late in the window -> suggests the window end", () => {
    const r = computeNapSuggestion({
      birthDateIso,
      lastSleepEndIso: "2026-05-24T12:00:00Z",
      timezone: tz,
      now: new Date("2026-05-24T13:27:00Z"), // 10:27 local, after midpoint 10:25
    });
    expect(r).toMatchObject({
      kind: "NAP",
      suggestedNapTime: "10:30",
      confidence: "high",
      minutesUntilSuggested: 3,
    });
    expect(r.reasoning).toContain("parte final da janela");
  });

  it("overdue window -> 'Assim que possível', medium confidence", () => {
    const r = computeNapSuggestion({
      birthDateIso,
      lastSleepEndIso: "2026-05-24T12:00:00Z",
      timezone: tz,
      now: new Date("2026-05-24T14:00:00Z"), // 11:00 local
    });
    expect(r).toMatchObject({
      suggestedNapTime: "Assim que possível",
      confidence: "medium",
      minutesUntilSuggested: 0,
    });
    expect(r.reasoning).toContain("já passou");
  });

  it("no lastSleepEndIso -> low-confidence 'no history' NAP", () => {
    const r = computeNapSuggestion({
      birthDateIso,
      lastSleepEndIso: null,
      timezone: tz,
      now: new Date("2026-05-24T12:30:00Z"),
    });
    expect(r).toEqual({
      kind: "NAP",
      suggestedNapTime: "",
      windowStart: "",
      windowEnd: "",
      reasoning:
        "Sem um sono concluído recente, não dá para estimar a janela. Registre o fim da última soneca ou do sono noturno.",
      confidence: "low",
      minutesUntilSuggested: 0,
    });
  });

  it("invalid lastSleepEndIso -> low-confidence NAP", () => {
    const r = computeNapSuggestion({
      birthDateIso,
      lastSleepEndIso: "not-a-date",
      timezone: tz,
      now: new Date("2026-05-24T12:30:00Z"),
    });
    expect(r).toMatchObject({
      kind: "NAP",
      suggestedNapTime: "",
      confidence: "low",
      minutesUntilSuggested: 0,
      reasoning: "Data do último sono inválida. Verifique o registro.",
    });
  });

  describe("evening, now 19:30 local", () => {
    const common = {
      birthDateIso,
      lastSleepEndIso: "2026-05-24T19:15:00Z", // 16:15 local
      lastSessionType: "NAP" as const,
      timezone: tz,
      now: new Date("2026-05-24T22:30:00Z"),
    };

    it("with >=3 nights starting ~19:00 -> NIGHT_SLEEP", () => {
      const r = computeNapSuggestion({ ...common, recentSessions: nights(3) });
      expect(r.kind).toBe("NIGHT_SLEEP");
      expect(r).toMatchObject({
        windowStart: "17:30",
        windowEnd: "17:45",
        suggestedNapTime: "Assim que possível",
        confidence: "medium",
      });
    });

    it("with only 2 nights the history is not used -> NAP", () => {
      const r = computeNapSuggestion({ ...common, recentSessions: nights(2) });
      expect(r.kind).toBe("NAP");
    });
  });

  it("after a late nap (ends 17:15, past the 17:00 cutoff) -> NIGHT_SLEEP", () => {
    const r = computeNapSuggestion({
      birthDateIso,
      lastSleepEndIso: "2026-05-24T20:15:00Z", // 17:15 local
      timezone: tz,
      now: new Date("2026-05-24T20:30:00Z"), // 17:30 local
    });
    expect(r).toMatchObject({
      kind: "NIGHT_SLEEP",
      windowStart: "18:30",
      windowEnd: "18:45",
      suggestedNapTime: "18:40",
    });
  });

  describe("night wakings (9 months)", () => {
    const nineMonths = "2025-08-24"; // 39 weeks before 2026-05-24

    it("night ended at 23:00 -> NIGHT_SLEEP, minutes roll to the next day", () => {
      const r = computeNapSuggestion({
        birthDateIso: nineMonths,
        lastSleepEndIso: "2026-05-25T02:00:00Z", // 23:00 local
        lastSessionType: "NIGHT_SLEEP",
        timezone: tz,
        now: new Date("2026-05-25T02:10:00Z"), // 23:10 local
      });
      expect(r.kind).toBe("NIGHT_SLEEP");
      expect(r.suggestedNapTime).toBe("02:30");
      expect(r.minutesUntilSuggested).toBe(200);
    });

    it("night ended at 02:00, now 02:05 -> NIGHT_SLEEP", () => {
      const r = computeNapSuggestion({
        birthDateIso: nineMonths,
        lastSleepEndIso: "2026-05-24T05:00:00Z", // 02:00 local
        lastSessionType: "NIGHT_SLEEP",
        timezone: tz,
        now: new Date("2026-05-24T05:05:00Z"), // 02:05 local
      });
      expect(r.kind).toBe("NIGHT_SLEEP");
      expect(r.minutesUntilSuggested).toBe(205);
    });
  });
});
