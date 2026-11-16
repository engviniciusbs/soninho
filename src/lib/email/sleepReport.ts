import { Resend } from "resend";
import { render } from "@react-email/render";
import { differenceInWeeks } from "date-fns";
import {
  getReportPeriod,
  groupSessionsByLocalDay,
  DEFAULT_REPORT_TIMEZONE,
  type ReportPeriod,
} from "@/lib/email/reportPeriod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeEnvironmentCorrelation } from "@/lib/sleep/environmentCorrelation";
import { getAgeSchedule } from "@/lib/sleep/schedules";
import { computeFeedingStats } from "@/lib/feeding/feedingStatistics";
import WeeklyReport, {
  type WeeklyReportBabyStats,
} from "@/emails/WeeklyReport";
import type {
  SleepSession,
  BottleFeeding,
  BreastfeedingSession,
  SolidFeeding,
} from "@/types";
import { addDaysToKey, parseLocalDate } from "@/lib/dates/localDate";
import { formatDecimal } from "@/lib/format/number";
const FROM = "Soninho <sono@soninho.baby>";

/** Minutes of a finished session (duration_min, else from its timestamps). */
function sessionMinutes(s: SleepSession): number {
  if (s.duration_min != null) return s.duration_min;
  return (Date.parse(s.end_time!) - Date.parse(s.start_time)) / 60000;
}

/**
 * Stats over the local days of `period`. Totals are split by local day; the
 * longest night and the average nap are per session (started in the period),
 * so a 19:00 to 06:00 night counts as 11 h, not as two halves.
 */
export function buildBabyStats(
  sessions: SleepSession[],
  birthDate: string,
  name: string,
  emoji: string,
  period: Pick<ReportPeriod, "startKey" | "endKey" | "startUtc" | "endUtc">,
  feeding?: {
    bottles: BottleFeeding[];
    breastSessions: BreastfeedingSession[];
    solids: SolidFeeding[];
  },
  timeZone: string = DEFAULT_REPORT_TIMEZONE
): WeeklyReportBabyStats {
  const ageWeeks = differenceInWeeks(new Date(), parseLocalDate(birthDate));
  const schedule = getAgeSchedule(ageWeeks);

  const dayKeys: string[] = [];
  for (let k = period.startKey; k <= period.endKey; k = addDaysToKey(k, 1)) dayKeys.push(k);

  const finished = sessions.filter((s) => s.end_time != null && s.duration_min != null);
  const byDay = groupSessionsByLocalDay(finished, timeZone);

  const dayTotals = dayKeys.map((k) =>
    (byDay.get(k) ?? []).reduce((a, x) => a + x.napMinutes + x.nightMinutes, 0)
  );
  const daysWithData = dayTotals.filter((m) => m > 0);
  const avgTotalHours =
    daysWithData.length > 0
      ? daysWithData.reduce((a, m) => a + m, 0) / daysWithData.length / 60
      : 0;

  const napDayCounts = dayKeys
    .map((k) => (byDay.get(k) ?? []).filter((x) => x.napMinutes > 0).length)
    .filter((n) => n > 0);
  const napCountAvg =
    napDayCounts.length > 0
      ? napDayCounts.reduce((a, n) => a + n, 0) / napDayCounts.length
      : 0;

  const startMs = period.startUtc.getTime();
  const endMs = period.endUtc.getTime();
  const inPeriod = finished.filter((s) => {
    const t = Date.parse(s.start_time);
    return t >= startMs && t < endMs;
  });
  const naps = inPeriod.filter((s) => s.type === "NAP");
  const avgNapMinutes =
    naps.length > 0 ? naps.reduce((a, s) => a + sessionMinutes(s), 0) / naps.length : 0;
  const longestNightMinutes = Math.max(
    0,
    ...inPeriod.filter((s) => s.type === "NIGHT_SLEEP").map(sessionMinutes)
  );

  const adherencePct = Math.min(
    100,
    Math.round((avgTotalHours / schedule.totalSleepHours) * 100)
  );

  const env = computeEnvironmentCorrelation(sessions);
  const bestEnvironment = env.bestTemperature
    ? env.bestTemperature.avgQuality != null
      ? `${env.bestTemperature.label} (qualidade ${formatDecimal(env.bestTemperature.avgQuality)}/5)`
      : env.bestTemperature.label
    : null;

  const feedingStats = feeding
    ? computeFeedingStats(
        feeding.bottles,
        feeding.breastSessions,
        feeding.solids,
        dayKeys.length
      )
    : null;

  return {
    name,
    emoji,
    ageLabel: schedule.ageLabel,
    avgTotalHours,
    targetTotalHours: schedule.totalSleepHours,
    avgNapMinutes,
    napCountAvg,
    // Unrounded: the e-mail shows it as a duration ("10h 54min").
    longestNightHours: longestNightMinutes / 60,
    adherencePct,
    bestEnvironment,
    feeding: feedingStats,
  };
}

function subjectFor(kind: "weekly" | "manual", days: number): string {
  if (kind === "weekly") return "Seu resumo de sono da semana";
  return `Seu resumo de sono — últimos ${days} dias`;
}

export type SendSleepReportResult =
  | { ok: true }
  | { ok: false; reason: "no_data" | "deduped" | "no_email" | "send_failed" };

export async function sendSleepReport(params: {
  supabase: SupabaseClient;
  resend: Resend;
  userId: string;
  email: string;
  parentName: string;
  periodDays: number;
  kind: "weekly" | "manual";
  dedupeKey: string;
  skipDedupe?: boolean;
  timeZone?: string;
  babies: { id: string; name: string; birth_date: string; avatar_emoji: string | null }[];
}): Promise<SendSleepReportResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://soninho.baby";
  const timeZone = params.timeZone || DEFAULT_REPORT_TIMEZONE;
  // The weekly e-mail covers complete days only: it ends yesterday.
  const period = getReportPeriod(new Date(), params.periodDays, timeZone, {
    endsYesterday: params.kind === "weekly",
  });
  const periodStartIso = period.startUtc.toISOString();
  const periodEndIso = period.endUtc.toISOString();
  const periodStartStr = period.startKey;
  const periodEndStr = period.endKey;
  const periodLabel = period.label;

  // Claim the dedupe key first (insert ... on conflict do nothing); the unique
  // constraint makes concurrent requests race safely.
  let claimed = false;
  if (!params.skipDedupe) {
    const { data: inserted, error: claimError } = await params.supabase
      .from("email_log")
      .upsert(
        {
          user_id: params.userId,
          kind: params.kind,
          period_start: periodStartStr,
          period_end: periodEndStr,
          dedupe_key: params.dedupeKey,
          status: "sent",
          sent_at: new Date().toISOString(),
        },
        { onConflict: "dedupe_key", ignoreDuplicates: true }
      )
      .select("id");

    if (claimError) {
      console.error("[sleep-report] claim error:", claimError);
      return { ok: false, reason: "send_failed" };
    }
    if (!inserted || inserted.length === 0) {
      return { ok: false, reason: "deduped" };
    }
    claimed = true;
  }

  const releaseClaim = async () => {
    if (!claimed) return;
    const { error } = await params.supabase
      .from("email_log")
      .delete()
      .eq("dedupe_key", params.dedupeKey);
    if (error) console.error("[sleep-report] release claim error:", error);
  };

  try {
    return await buildAndSend();
  } catch (err) {
    await releaseClaim();
    throw err;
  }

  async function buildAndSend(): Promise<SendSleepReportResult> {
  const babyStats: WeeklyReportBabyStats[] = [];

  for (const baby of params.babies) {
    const [{ data: sessions }, { data: bottles }, { data: breastSessions }, { data: solids }] =
      await Promise.all([
        // Overlap with the period: a night that began the evening before counts.
        params.supabase
          .from("sleep_sessions")
          .select("*")
          .eq("baby_id", baby.id)
          .lt("start_time", periodEndIso)
          .gt("end_time", periodStartIso)
          .order("start_time", { ascending: true }),
        params.supabase
          .from("bottle_feedings")
          .select("*")
          .eq("baby_id", baby.id)
          .gte("start_time", periodStartIso)
          .lt("start_time", periodEndIso),
        params.supabase
          .from("breastfeeding_sessions")
          .select("*")
          .eq("baby_id", baby.id)
          .gte("start_time", periodStartIso)
          .lt("start_time", periodEndIso),
        params.supabase
          .from("solid_feedings")
          .select("*")
          .eq("baby_id", baby.id)
          .gte("start_time", periodStartIso)
          .lt("start_time", periodEndIso),
      ]);

    const list = (sessions ?? []) as SleepSession[];
    const feeding = {
      bottles: (bottles ?? []) as BottleFeeding[],
      breastSessions: (breastSessions ?? []) as BreastfeedingSession[],
      solids: (solids ?? []) as SolidFeeding[],
    };
    const hasSleepData = list.filter((s) => s.duration_min != null).length > 0;
    const hasFeedingData =
      feeding.bottles.length > 0 ||
      feeding.breastSessions.length > 0 ||
      feeding.solids.length > 0;
    if (!hasSleepData && !hasFeedingData) continue;

    babyStats.push(
      buildBabyStats(
        list,
        baby.birth_date,
        baby.name,
        baby.avatar_emoji || "👶",
        period,
        feeding,
        timeZone
      )
    );
  }

  if (babyStats.length === 0) {
    await releaseClaim();
    return { ok: false, reason: "no_data" };
  }

  const isManual = params.kind === "manual";

  const html = await render(
    WeeklyReport({
      parentName: params.parentName,
      periodLabel,
      babies: babyStats,
      appUrl,
      reportTitle: isManual
        ? `Resumo dos últimos ${params.periodDays} dias`
        : undefined,
      previewText: isManual
        ? `Seu resumo de sono dos últimos ${params.periodDays} dias no Soninho`
        : undefined,
      footerNote: isManual
        ? "Este relatório foi enviado a pedido em Mais → Relatórios."
        : undefined,
    })
  );

  const { error } = await params.resend.emails.send({
    from: FROM,
    to: params.email,
    subject: subjectFor(params.kind, params.periodDays),
    html,
  });

  if (error) {
    console.error("[sleep-report] Resend error:", error);
    await releaseClaim();
    return { ok: false, reason: "send_failed" };
  }

  return { ok: true };
  }
}

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }
  return new Resend(apiKey);
}
