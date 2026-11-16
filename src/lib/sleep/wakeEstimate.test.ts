import { describe, expect, it } from "vitest";
import { formatInTimeZone } from "date-fns-tz";
import { estimateWakeTime } from "@/lib/sleep/wakeEstimate";

const TZ = "America/Sao_Paulo";
const night = (endLocal: string) => ({
  start: "2026-03-01T00:00:00.000Z",
  end: new Date(`${endLocal}-03:00`).toISOString(),
});

describe("estimateWakeTime", () => {
  const now = new Date("2026-03-10T22:00:00-03:00");

  it("devolve null com menos de 3 noites", () => {
    expect(
      estimateWakeTime([night("2026-03-08T06:00:00"), night("2026-03-09T06:20:00")], now, TZ),
    ).toBeNull();
  });

  it("média de 06:00, 06:20 e 06:10 resulta em 06:10 do próximo dia", () => {
    const r = estimateWakeTime(
      [night("2026-03-07T06:00:00"), night("2026-03-08T06:20:00"), night("2026-03-09T06:10:00")],
      now,
      TZ,
    );
    expect(r).not.toBeNull();
    expect(formatInTimeZone(r!, TZ, "yyyy-MM-dd HH:mm")).toBe("2026-03-11 06:10");
  });

  it("usa média circular perto da meia-noite", () => {
    const r = estimateWakeTime(
      [night("2026-03-07T23:50:00"), night("2026-03-09T00:10:00"), night("2026-03-09T00:00:00")],
      now,
      TZ,
    );
    expect(formatInTimeZone(r!, TZ, "HH:mm")).toBe("00:00");
  });

  it("ignora noites sem fim", () => {
    const r = estimateWakeTime(
      [
        night("2026-03-07T06:00:00"),
        { start: "2026-03-08T00:00:00.000Z", end: null },
        night("2026-03-09T06:00:00"),
      ],
      now,
      TZ,
    );
    expect(r).toBeNull();
  });

  it("devolve hoje se o horário ainda não passou", () => {
    const early = new Date("2026-03-10T03:00:00-03:00");
    const r = estimateWakeTime(
      [night("2026-03-07T06:00:00"), night("2026-03-08T06:00:00"), night("2026-03-09T06:00:00")],
      early,
      TZ,
    );
    expect(formatInTimeZone(r!, TZ, "yyyy-MM-dd HH:mm")).toBe("2026-03-10 06:00");
  });
});
