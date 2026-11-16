import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSleepContext } from "./analyzeSleep";
import type { Baby, SleepSession } from "@/types";

const ORIGINAL_TZ = process.env.TZ;
afterAll(() => {
  process.env.TZ = ORIGINAL_TZ;
});

const baby = { id: "b1", name: "Lia", birth_date: "2026-02-10" } as Baby;

function nap(start: string, end: string): SleepSession {
  return {
    id: start,
    baby_id: "b1",
    type: "NAP",
    start_time: start,
    end_time: end,
    duration_min: Math.round((Date.parse(end) - Date.parse(start)) / 60000),
  } as unknown as SleepSession;
}

describe.each(["UTC", "America/Sao_Paulo"])("buildSleepContext (process TZ=%s)", (tz) => {
  beforeEach(() => {
    process.env.TZ = tz;
    vi.useFakeTimers({ toFake: ["Date"] });
    // 22:30 of 16/11 in São Paulo; the UTC server is already on 17/11.
    vi.setSystemTime(new Date("2026-11-17T01:30:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("treats the São Paulo day as today", () => {
    // 14:00 to 15:00 of 16/11 in São Paulo.
    const ctx = buildSleepContext(baby, [nap("2026-11-16T17:00:00Z", "2026-11-16T18:00:00Z")]);
    const days = ctx.split("\n").filter((l) => /^ {2}\d\d\/\d\d:/.test(l));
    expect(days).toHaveLength(7);
    expect(days[0]).toMatch(/^ {2}10\/11:/);
    expect(days[6]).toBe("  16/11: 1.0h total, 1 sonecas");
    expect(ctx).toContain("Horário de referência (agora): 22:30");
  });

  it("shows the birth date as entered", () => {
    expect(buildSleepContext(baby, [])).toContain("Data de nascimento: 10/02/2026");
  });

  it("states the baby's sex, or that it was not informed", () => {
    expect(buildSleepContext({ ...baby, sex: "F" }, [])).toContain("Sexo: menina");
    expect(buildSleepContext({ ...baby, sex: "M" }, [])).toContain("Sexo: menino");
    expect(buildSleepContext({ ...baby, sex: null }, [])).toContain("Sexo: não informado");
  });

  it("states the age in months", () => {
    expect(buildSleepContext(baby, [])).toContain("Idade: 39 semanas (9 meses)");
  });
});
