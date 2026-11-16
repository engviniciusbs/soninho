import { Resend } from "resend";
import { render } from "@react-email/render";
import { differenceInWeeks } from "date-fns";
import { getReportPeriod, DEFAULT_REPORT_TIMEZONE } from "@/lib/email/reportPeriod";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getDailyTotals,
  getNapCountPerDay,
  getLongestNightStretch,
} from "@/lib/sleep/statistics";
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
import { parseLocalDate } from "@/lib/dates/localDate";
const FROM = "Soninho <sono@soninho.baby>";

export function buildBabyStats(
  sessions: SleepSession[],
  birthDate: string,
  name: string,
  emoji: string,
  periodDays: number,
  feeding?: {
    bottles: BottleFeeding[];
    breastSessions: BreastfeedingSession[];
    solids: SolidFeeding[];
  },
  timeZone: string = DEFAULT_REPORT_TIMEZONE
): WeeklyReportBabyStats {
  const ageWeeks = differenceInWeeks(new Date(), parseLocalDate(birthDate));
  const schedule = getAgeSchedule(ageWeeks);

  const daily = getDailyTotals(sessions, periodDays, timeZone);
  const daysWithData = daily.filter((d) => d.totalHours > 0);
  const denom = daysWithData.length || 1;

  const avgTotalHours =
    daysWithData.reduce((a, d) => a + d.totalHours, 0) / denom;
  const avgNapHours =
    daysWithData.reduce((a, d) => a + d.napHours, 0) / denom;

  const napCounts = getNapCountPerDay(sessions, periodDays, timeZone);
  const napDays = napCounts.filter((d) => d.count > 0);
  const napCountAvg =
    napDays.length > 0
      ? napDays.reduce((a, d) => a + d.count, 0) / napDays.length
      : 0;

  const nightStretch = getLongestNightStretch(sessions, periodDays, timeZone);
  const longestNightHours = Math.max(0, ...nightStretch.map((d) => d.hours));

  const adherencePct = Math.min(
    100,
    Math.round((avgTotalHours / schedule.totalSleepHours) * 100)
  );

  const env = computeEnvironmentCorrelation(sessions);
  const bestEnvironment = env.bestTemperature
    ? `${env.bestTemperature.label} (qualidade ${env.bestTemperature.avgQuality}/5)`
    : null;

  const feedingStats = feeding
    ? computeFeedingStats(
        feeding.bottles,
        feeding.breastSessions,
        feeding.solids,
        periodDays
      )
    : null;

  return {
    name,
    emoji,
    ageLabel: schedule.ageLabel,
    avgTotalHours: Number.isFinite(avgTotalHours) ? avgTotalHours : 0,
    targetTotalHours: schedule.totalSleepHours,
    avgNapHours: Number.isFinite(avgNapHours) ? avgNapHours : 0,
    napCountAvg,
    longestNightHours,
    adherencePct,
    bestEnvironment,
    feeding: feedingStats,
  };
}

function subjectFor(kind: "weekly" | "manual", days: number): string {
  if (kind === "weekly") return "🌙 Seu resumo de sono da semana";
  return `🌙 Seu resumo de sono — últimos ${days} dias`;
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
  const period = getReportPeriod(new Date(), params.periodDays, timeZone);
  const periodStart = period.startUtc;
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
        params.supabase
          .from("sleep_sessions")
          .select("*")
          .eq("baby_id", baby.id)
          .gte("start_time", periodStart.toISOString())
          .order("start_time", { ascending: true }),
        params.supabase
          .from("bottle_feedings")
          .select("*")
          .eq("baby_id", baby.id)
          .gte("start_time", periodStart.toISOString()),
        params.supabase
          .from("breastfeeding_sessions")
          .select("*")
          .eq("baby_id", baby.id)
          .gte("start_time", periodStart.toISOString()),
        params.supabase
          .from("solid_feedings")
          .select("*")
          .eq("baby_id", baby.id)
          .gte("start_time", periodStart.toISOString()),
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
        params.periodDays,
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
        ? "Este relatório foi enviado a pedido em Configurações → Ferramentas."
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
