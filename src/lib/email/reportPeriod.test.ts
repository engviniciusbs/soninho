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

  it("a period that ends yesterday stops at the last complete local day", () => {
    // 22:30 of 16/11 in São Paulo while the server (UTC) is already on 17/11.
    const now = new Date("2026-11-17T01:30:00Z");
    const p = getReportPeriod(now, 7, "America/Sao_Paulo", { endsYesterday: true });
    expect(p.endKey).toBe("2026-11-15");
    expect(p.startKey).toBe("2026-11-09");
    expect(p.endUtc.toISOString()).toBe("2026-11-16T03:00:00.000Z");
    expect(p.label).toBe("de 09/11 a 15/11 (últimos 7 dias)");
  });

  describe("DST (America/New_York, spring forward 2026-03-08)", () => {
    const tz = "America/New_York";

    it("period ending 2026-03-10 has 7 local keys and DST-aware bounds", () => {
      const now = new Date("2026-03-10T15:00:00Z");
      const p = getReportPeriod(now, 7, tz);
      expect(p.startKey).toBe("2026-03-04");
      expect(p.endKey).toBe("2026-03-10");
      expect(p.label).toBe("de 04/03 a 10/03 (últimos 7 dias)");
      // 03-04 00:00 EST = 05:00Z; 03-11 00:00 EDT = 04:00Z
      expect(p.startUtc.toISOString()).toBe("2026-03-04T05:00:00.000Z");
      expect(p.endUtc.toISOString()).toBe("2026-03-11T04:00:00.000Z");
    });

    it("splits a session across the spring-forward night", () => {
      // 23:00 EST on 03-07 -> 06:00 EDT on 03-08 (6 real hours)
      const s = sess("2026-03-08T04:00:00Z", "2026-03-08T10:00:00Z");
      const m = groupSessionsByLocalDay([s], tz);
      expect([...m.keys()]).toEqual(["2026-03-07", "2026-03-08"]);
      // 04:00Z -> 05:00Z (local midnight EST) = 60 min
      expect(m.get("2026-03-07")![0].nightMinutes).toBe(60);
      // 05:00Z -> 10:00Z = 300 min
      expect(m.get("2026-03-08")![0].nightMinutes).toBe(300);
    });

    it("treats 2026-03-08 as a 23-hour local day", () => {
      const s = sess("2026-03-08T05:00:00Z", "2026-03-09T04:00:00Z");
      const m = groupSessionsByLocalDay([s], tz);
      expect([...m.keys()]).toEqual(["2026-03-08"]);
      expect(m.get("2026-03-08")![0].nightMinutes).toBe(23 * 60);
    });
  });
});
