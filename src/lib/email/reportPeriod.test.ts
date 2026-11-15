import { describe, it, expect } from "vitest";
import { getReportPeriod, groupSessionsByLocalDay } from "./reportPeriod";
import type { SleepSession } from "@/types";

function sess(start: string, end: string, type = "NIGHT_SLEEP"): SleepSession {
  return {
    id: "s",
    baby_id: "b",
    type,
    start_time: start,
    end_time: end,
    duration_min: (Date.parse(end) - Date.parse(start)) / 60000,
  } as unknown as SleepSession;
}

describe("reportPeriod", () => {
  it("report_days_use_user_timezone", () => {
    const s = sess("2026-05-24T01:00:00Z", "2026-05-24T03:00:00Z");
    const sp = groupSessionsByLocalDay([s], "America/Sao_Paulo");
    expect([...sp.keys()]).toEqual(["2026-05-23"]);
    // would fail if the process TZ (America/Sao_Paulo) were used
    const tokyo = groupSessionsByLocalDay([s], "Asia/Tokyo");
    expect([...tokyo.keys()]).toEqual(["2026-05-24"]);
    const utc = groupSessionsByLocalDay([s], "UTC");
    expect([...utc.keys()]).toEqual(["2026-05-24"]);
  });

  it("splits sessions across local midnight in explicit tz", () => {
    const s = sess("2026-05-24T14:00:00Z", "2026-05-24T17:00:00Z"); // Tokyo 23:00 -> 02:00
    const m = groupSessionsByLocalDay([s], "Asia/Tokyo");
    expect(m.get("2026-05-24")![0].nightMinutes).toBe(60);
    expect(m.get("2026-05-25")![0].nightMinutes).toBe(120);
  });

  it("period_keys_local", () => {
    const now = new Date("2026-05-25T02:00:00Z");
    const sp = getReportPeriod(now, 7, "America/Sao_Paulo");
    expect(sp.endKey).toBe("2026-05-24");
    expect(sp.startKey).toBe("2026-05-18");
    expect(sp.label).toBe("de 18/05 a 24/05 (últimos 7 dias)");
    expect(sp.startUtc.toISOString()).toBe("2026-05-18T03:00:00.000Z");
    const utc = getReportPeriod(now, 7, "UTC");
    expect(utc.endKey).toBe("2026-05-25");
    const tokyo = getReportPeriod(now, 7, "Asia/Tokyo");
    expect(tokyo.endKey).toBe("2026-05-25");
    expect(tokyo.startUtc.toISOString()).toBe("2026-05-18T15:00:00.000Z");
  });
});
