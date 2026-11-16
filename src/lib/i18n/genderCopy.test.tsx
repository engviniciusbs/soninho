// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WakeWindowCard } from "@/components/home/WakeWindowCard";
import { describeSleep } from "@/components/sleep/SleepCard";
import { howFellAsleepOptions, wakeReasonOptions } from "@/lib/sleep/captureLabels";
import { quickQuestions } from "@/components/ai/AIChat";
import type { SleepSession } from "@/types";

afterEach(cleanup);

const range = { minMinutes: 60, maxMinutes: 90 } as Parameters<typeof WakeWindowCard>[0]["range"];

function card(sex: "F" | "M" | null) {
  return render(
    <WakeWindowCard elapsedMinutes={30} status="green" range={range} hasLastSleep isLoading={false} sex={sex} />
  );
}

describe("gendered copy follows babies.sex", () => {
  it("wake window card: 'Tempo acordada' for a girl, neutral 'Tempo acordado' when unknown", () => {
    card("F");
    expect(screen.getByText("Tempo acordada")).toBeInTheDocument();
    cleanup();
    card(null);
    expect(screen.getByText("Tempo acordado")).toBeInTheDocument();
    expect(screen.queryByText("Tempo acordada")).not.toBeInTheDocument();
  });

  it("how-fell-asleep and wake-reason options agree (neutral without sex)", () => {
    const berco = (sex: "F" | "M" | null) => howFellAsleepOptions(sex).find((o) => o.value === "berco")!.label;
    const alone = (sex: "F" | "M" | null) => wakeReasonOptions(sex).find((o) => o.value === "sozinho")!.label;
    expect(berco("F")).toBe("Sozinha no berço");
    expect(berco("M")).toBe("Sozinho no berço");
    expect(berco(null)).toBe("No berço, sem ajuda");
    expect(alone("F")).toBe("Acordou sozinha");
    expect(alone("M")).toBe("Acordou sozinho");
    expect(alone(null)).toBe("Acordou por conta própria");
  });

  it("Registro row: 'adormeceu sozinha no berço' for a girl, neutral otherwise", () => {
    const s = {
      start_time: "2026-01-01T12:00:00.000Z",
      end_time: "2026-01-01T13:00:00.000Z",
      duration_min: 60,
      type: "NAP",
      how_fell_asleep: "berco",
    } as SleepSession;
    expect(describeSleep(s, "F").subtitle).toContain("adormeceu sozinha no berço");
    expect(describeSleep(s, "M").subtitle).toContain("adormeceu sozinho no berço");
    expect(describeSleep(s, null).subtitle).toContain("adormeceu no berço sem ajuda");
  });

  it("AI quick questions: no 'minha bebê' or 'dela' when the sex is unknown", () => {
    const f = quickQuestions("F").map((q) => q.question).join(" ");
    const n = quickQuestions(null).map((q) => q.question).join(" ");
    expect(f).toContain("minha bebê");
    expect(f).toContain("idade dela");
    expect(n).not.toMatch(/minha bebê|meu bebê|\bdel[ae]\b/);
  });
});
