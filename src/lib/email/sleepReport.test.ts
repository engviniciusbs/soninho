import { afterEach, describe, it, expect, vi } from "vitest";
import { render } from "@react-email/render";
import WeeklyReport from "@/emails/WeeklyReport";
import { getReportPeriod } from "./reportPeriod";
import { buildBabyStats, sendSleepReport } from "./sleepReport";
import type { SleepSession } from "@/types";

/** Chainable, awaitable query builder that resolves to `{ data }` at any point. */
function query(data: unknown[]) {
  const q: Record<string, unknown> = {
    then: (resolve: (v: unknown) => void) => resolve({ data }),
  };
  for (const m of ["select", "eq", "gte", "gt", "lt", "or", "order"]) q[m] = () => q;
  return q;
}

const SESSION = {
  id: "s1",
  baby_id: "b1",
  type: "NAP",
  start_time: new Date(Date.now() - 3_600_000).toISOString(),
  end_time: new Date().toISOString(),
  duration_min: 60,
};

function fakeSupabase(opts: { inserted: boolean; withData?: boolean; sessions?: unknown[] }) {
  const deleted: string[] = [];
  const claims: Record<string, unknown>[] = [];
  const supabase = {
    from: (table: string) => {
      if (table === "email_log") {
        return {
          upsert: (row: Record<string, unknown>) => ({
            _: claims.push(row),
            select: async () => ({
              data: opts.inserted ? [{ id: 1 }] : [],
              error: null,
            }),
          }),
          delete: () => ({
            eq: async (_col: string, value: string) => {
              deleted.push(value);
              return { error: null };
            },
          }),
        };
      }
      if (table === "sleep_sessions" && opts.sessions) return query(opts.sessions);
      return query(
        table === "sleep_sessions" && opts.withData ? [SESSION] : []
      );
    },
  };
  return { supabase: supabase as never, deleted, claims };
}

const base = {
  userId: "u",
  email: "e@x.com",
  parentName: "",
  periodDays: 7,
  kind: "manual" as const,
  dedupeKey: "k",
  babies: [
    { id: "b1", name: "Bebe", birth_date: "2026-01-01", avatar_emoji: null },
  ],
};

const resendWith = (send: unknown) => ({ emails: { send } }) as never;

describe("sendSleepReport claim", () => {
  it("returns deduped when claim not inserted", async () => {
    const { supabase } = fakeSupabase({ inserted: false });
    const send = vi.fn();
    const r = await sendSleepReport({ ...base, supabase, resend: resendWith(send) });
    expect(r).toEqual({ ok: false, reason: "deduped" });
    expect(send).not.toHaveBeenCalled();
  });

  it("releases claim when there is no data", async () => {
    const { supabase, deleted } = fakeSupabase({ inserted: true });
    const r = await sendSleepReport({ ...base, supabase, resend: resendWith(vi.fn()) });
    expect(r).toEqual({ ok: false, reason: "no_data" });
    expect(deleted).toEqual(["k"]);
  });

  it("releases claim when Resend returns an error", async () => {
    const { supabase, deleted } = fakeSupabase({ inserted: true, withData: true });
    const send = vi.fn().mockResolvedValue({ error: { message: "boom" } });
    const r = await sendSleepReport({ ...base, supabase, resend: resendWith(send) });
    expect(send).toHaveBeenCalledOnce();
    expect(r).toEqual({ ok: false, reason: "send_failed" });
    expect(deleted).toEqual(["k"]);
  });

  it("releases claim and propagates when Resend throws", async () => {
    const { supabase, deleted } = fakeSupabase({ inserted: true, withData: true });
    const send = vi.fn().mockRejectedValue(new Error("network"));
    await expect(
      sendSleepReport({ ...base, supabase, resend: resendWith(send) })
    ).rejects.toThrow("network");
    expect(deleted).toEqual(["k"]);
  });

  it("keeps the claim on success", async () => {
    const { supabase, deleted } = fakeSupabase({ inserted: true, withData: true });
    const send = vi.fn().mockResolvedValue({ error: null });
    const r = await sendSleepReport({ ...base, supabase, resend: resendWith(send) });
    expect(r).toEqual({ ok: true });
    expect(deleted).toEqual([]);
  });
});

const TZ = "America/Sao_Paulo";

function sess(type: "NAP" | "NIGHT_SLEEP", start: string, end: string): SleepSession {
  return {
    id: `${type}-${start}`,
    baby_id: "b1",
    type,
    start_time: start,
    end_time: end,
    duration_min: Math.round((Date.parse(end) - Date.parse(start)) / 60000),
  } as unknown as SleepSession;
}

describe("buildBabyStats", () => {
  const period = getReportPeriod(new Date("2026-11-17T01:30:00Z"), 7, TZ, {
    endsYesterday: true,
  }); // 09/11 to 15/11

  it("measures the longest night per session, across midnight", () => {
    // 19:00 of 12/11 to 06:00 of 13/11 in São Paulo: one 11 h night.
    const night = sess("NIGHT_SLEEP", "2026-11-12T22:00:00Z", "2026-11-13T09:00:00Z");
    const stats = buildBabyStats([night], "2026-02-10", "Lia", "", period, undefined, TZ);
    expect(stats.longestNightHours).toBe(11);
  });

  it("reports the average nap length, not the nap hours per day", () => {
    const naps = [
      sess("NAP", "2026-11-10T12:00:00Z", "2026-11-10T13:00:00Z"), // 60 min
      sess("NAP", "2026-11-10T17:00:00Z", "2026-11-10T17:30:00Z"), // 30 min
      sess("NAP", "2026-11-11T12:00:00Z", "2026-11-11T13:30:00Z"), // 90 min
    ];
    const stats = buildBabyStats(naps, "2026-02-10", "Lia", "", period, undefined, TZ);
    expect(stats.avgNapMinutes).toBe(60);
  });

  it("ignores sleep after the period (today)", () => {
    const today = sess("NIGHT_SLEEP", "2026-11-16T22:00:00Z", "2026-11-17T01:00:00Z");
    const stats = buildBabyStats([today], "2026-02-10", "Lia", "", period, undefined, TZ);
    expect(stats.longestNightHours).toBe(0);
    expect(stats.avgTotalHours).toBe(0);
  });
});

describe("weekly e-mail copy", () => {
  it("points to Mais, never Configurações, and shows the nap length as a duration", async () => {
    const html = await render(
      WeeklyReport({
        parentName: "Ana",
        periodLabel: "x",
        appUrl: "https://soninho.baby",
        babies: [
          {
            name: "Lia",
            emoji: "",
            ageLabel: "9 meses",
            avgTotalHours: 13.5,
            targetTotalHours: 14,
            avgNapMinutes: 75,
            napCountAvg: 2,
            longestNightHours: 11,
            adherencePct: 96,
            bestEnvironment: null,
            feeding: null,
          },
        ],
      })
    );
    expect(html).toContain("Mais → Notificações");
    expect(html).not.toContain("Configurações");
    expect(html).toContain("1h 15min");
    // Hours as durations, never "13,5 h/dia" or "11,0 h máx.".
    expect(html).toContain("13h 30min");
    expect(html).toContain("11h");
    expect(html).not.toMatch(/13,5|11,0/);
  });
});

describe("manual report copy", () => {
  it("says it was requested in Mais → Relatórios", async () => {
    const { supabase } = fakeSupabase({ inserted: true, withData: true });
    const send = vi.fn().mockResolvedValue({ error: null });
    await sendSleepReport({ ...base, supabase, resend: resendWith(send) });
    const { html } = send.mock.calls[0][0] as { html: string };
    expect(html).toContain("Mais → Relatórios");
    expect(html).not.toContain("Configurações");
  });

  it("has no emoji in the subject", async () => {
    const { supabase } = fakeSupabase({ inserted: true, withData: true });
    const send = vi.fn().mockResolvedValue({ error: null });
    await sendSleepReport({ ...base, kind: "weekly", supabase, resend: resendWith(send) });
    const { subject } = send.mock.calls[0][0] as { subject: string };
    expect(subject).toBe("Seu resumo de sono da semana");
  });
});

describe("weekly sendSleepReport period", () => {
  afterEach(() => vi.useRealTimers());

  it("claims a week that ends yesterday (local), even with the server already on the next UTC day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-17T01:30:00Z"));
    const { supabase, claims } = fakeSupabase({ inserted: true });
    await sendSleepReport({
      ...base,
      kind: "weekly",
      timeZone: TZ,
      supabase,
      resend: resendWith(vi.fn()),
    });
    expect(claims[0]).toMatchObject({ period_start: "2026-11-09", period_end: "2026-11-15" });
  });
});

describe("manual report covers complete days only", () => {
  afterEach(() => vi.useRealTimers());

  it("at midday, today's 3 h do not pull the average down", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 16/11, 12:00 in São Paulo.
    vi.setSystemTime(new Date("2026-11-16T15:00:00Z"));
    const sessions: SleepSession[] = [];
    // Nights 19:00 to 08:00 from 09/11 to 15/11: 09/11 gets 5 h, 10/11 to
    // 15/11 get 8 h + 5 h = 13 h each.
    for (let d = 9; d <= 14; d++) {
      const day = String(d).padStart(2, "0");
      const next = String(d + 1).padStart(2, "0");
      sessions.push(sess("NIGHT_SLEEP", `2026-11-${day}T22:00:00Z`, `2026-11-${next}T11:00:00Z`));
    }
    sessions.push(sess("NIGHT_SLEEP", "2026-11-15T22:00:00Z", "2026-11-16T03:00:00Z"));
    // Today, 16/11: 3 h of naps so far.
    sessions.push(sess("NAP", "2026-11-16T11:00:00Z", "2026-11-16T14:00:00Z"));

    const { supabase, claims } = fakeSupabase({ inserted: true, sessions });
    const send = vi.fn().mockResolvedValue({ error: null });
    await sendSleepReport({ ...base, timeZone: TZ, supabase, resend: resendWith(send) });

    expect(claims[0]).toMatchObject({ period_start: "2026-11-09", period_end: "2026-11-15" });
    const { html } = send.mock.calls[0][0] as { html: string };
    // (5 + 6 × 13) / 7 = 11,857 h: today's 3 h are left out.
    expect(html).toContain("11h 51min");
    expect(html).toContain("dias completos");
  });
});

describe("a night still running at report time", () => {
  afterEach(() => vi.useRealTimers());
  // The weekly e-mail runs on Monday morning: 17/11 11:00 UTC = 08:00 local.
  const now = new Date("2026-11-17T11:00:00Z");
  const period = getReportPeriod(now, 7, TZ, { endsYesterday: true }); // 10/11 to 16/11
  // Sunday 16/11 19:00 local, not stopped yet.
  const running = {
    id: "run",
    baby_id: "b1",
    type: "NIGHT_SLEEP",
    start_time: "2026-11-16T22:00:00Z",
    end_time: null,
    duration_min: null,
  } as unknown as SleepSession;

  it("counts up to the period end, so Sunday night is not lost", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    const stats = buildBabyStats([running], "2026-02-10", "Lia", "", period, undefined, TZ);
    // 19:00 to 24:00 on 16/11: 5 h on the only day with data.
    expect(stats.avgTotalHours).toBe(5);
    // Not finished: never the longest night.
    expect(stats.longestNightHours).toBe(0);
  });

  it("a session left open for days is a forgotten stop, not sleep", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    const forgotten = { ...running, id: "old", start_time: "2026-11-12T22:00:00Z" } as SleepSession;
    const stats = buildBabyStats([forgotten], "2026-02-10", "Lia", "", period, undefined, TZ);
    expect(stats.avgTotalHours).toBe(0);
  });

  it("is data: the e-mail goes out", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    const { supabase } = fakeSupabase({ inserted: true, sessions: [running] });
    const send = vi.fn().mockResolvedValue({ error: null });
    const r = await sendSleepReport({ ...base, kind: "weekly", timeZone: TZ, supabase, resend: resendWith(send) });
    expect(r).toEqual({ ok: true });
  });
});

describe("e-mail with no sleep in the period", () => {
  it("shows a dash, never 0 min or 0%", async () => {
    const html = await render(
      WeeklyReport({
        parentName: "Ana",
        periodLabel: "x",
        appUrl: "https://soninho.baby",
        babies: [
          {
            name: "Lia",
            emoji: "",
            ageLabel: "9 meses",
            avgTotalHours: 0,
            targetTotalHours: 14,
            avgNapMinutes: 0,
            napCountAvg: 0,
            longestNightHours: 0,
            adherencePct: 0,
            bestEnvironment: null,
            feeding: null,
          },
        ],
      })
    );
    expect(html).not.toMatch(/\b0 ?min\b/);
    expect(html).not.toContain("0% da meta");
    expect(html).toContain("Sem sono registrado no período");
  });
});
