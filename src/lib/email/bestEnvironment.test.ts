import { describe, expect, it, vi } from "vitest";

const holder = vi.hoisted(() => ({ avgQuality: null as number | null }));
vi.mock("@/lib/sleep/environmentCorrelation", () => ({
  computeEnvironmentCorrelation: () => ({
    temperature: [],
    sleepSackTog: [],
    weather: [],
    bestTemperature: { label: "20–21°C", count: 3, avgQuality: holder.avgQuality, avgDurationMin: 60 },
  }),
}));

import { buildBabyStats } from "./sleepReport";
import { getReportPeriod } from "./reportPeriod";
import { buildSleepReportData } from "@/lib/report/SleepReportPdf";

const TZ = "America/Sao_Paulo";
const period = getReportPeriod(new Date("2026-11-17T01:30:00Z"), 7, TZ, { endsYesterday: true });

describe("best environment quality clause", () => {
  it("shows the quality with a comma when there is one", () => {
    holder.avgQuality = 4.5;
    expect(buildBabyStats([], "2026-02-10", "Lia", "", period, undefined, TZ).bestEnvironment).toBe(
      "20–21°C (qualidade 4,5/5)"
    );
    expect(buildSleepReportData([], { name: "Lia", birth_date: "2026-02-10" }, 7).bestEnvironment).toBe(
      "20–21°C (qualidade média 4,5/5)"
    );
  });

  it("omits the clause when there is no quality, never '0/5'", () => {
    holder.avgQuality = null;
    expect(buildBabyStats([], "2026-02-10", "Lia", "", period, undefined, TZ).bestEnvironment).toBe("20–21°C");
    expect(buildSleepReportData([], { name: "Lia", birth_date: "2026-02-10" }, 7).bestEnvironment).toBe("20–21°C");
  });
});
