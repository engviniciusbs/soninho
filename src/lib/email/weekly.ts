import { Resend } from "resend";
import { differenceInWeeks, parseISO, format, subDays } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getDailyTotals,
  getNapCountPerDay,
  getLongestNightStretch,
} from "@/lib/sleep/statistics";
import { computeEnvironmentCorrelation } from "@/lib/sleep/environmentCorrelation";
import { getAgeSchedule } from "@/lib/sleep/schedules";
import WeeklyReport, {
  type WeeklyReportBabyStats,
} from "@/emails/WeeklyReport";
import type { SleepSession } from "@/types";

const FROM = "Soninho <sono@soninho.baby>";
const PERIOD_DAYS = 7;

function buildBabyStats(
  sessions: SleepSession[],
  birthDate: string,
  name: string,
  emoji: string
): WeeklyReportBabyStats {
  const ageWeeks = differenceInWeeks(new Date(), parseISO(birthDate));
  const schedule = getAgeSchedule(ageWeeks);

  const daily = getDailyTotals(sessions, PERIOD_DAYS);
  const daysWithData = daily.filter((d) => d.totalHours > 0);
  const denom = daysWithData.length || 1;

  const avgTotalHours =
    daysWithData.reduce((a, d) => a + d.totalHours, 0) / denom;
  const avgNapHours =
    daysWithData.reduce((a, d) => a + d.napHours, 0) / denom;

  const napCounts = getNapCountPerDay(sessions, PERIOD_DAYS);
  const napDays = napCounts.filter((d) => d.count > 0);
  const napCountAvg =
    napDays.length > 0
      ? napDays.reduce((a, d) => a + d.count, 0) / napDays.length
      : 0;

  const nightStretch = getLongestNightStretch(sessions, PERIOD_DAYS);
  const longestNightHours = Math.max(0, ...nightStretch.map((d) => d.hours));

  const adherencePct = Math.min(
    100,
    Math.round((avgTotalHours / schedule.totalSleepHours) * 100)
  );

  const env = computeEnvironmentCorrelation(sessions);
  const bestEnvironment = env.bestTemperature
    ? `${env.bestTemperature.label} (qualidade ${env.bestTemperature.avgQuality}/5)`
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
  };
}

export async function dispatchWeeklyEmails(): Promise<{
  sent: number;
  skipped: number;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }
  const resend = new Resend(apiKey);
  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://soninho.baby";

  const now = new Date();
  const periodStart = subDays(now, PERIOD_DAYS);
  const periodStartStr = format(periodStart, "yyyy-MM-dd");
  const periodEndStr = format(now, "yyyy-MM-dd");
  const periodLabel = `de ${format(periodStart, "dd/MM")} a ${format(now, "dd/MM")}`;

  let sent = 0;
  let skipped = 0;

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .eq("weekly_email_enabled", true);

  if (!prefs || prefs.length === 0) return { sent: 0, skipped: 0 };

  for (const pref of prefs) {
    try {
      const dedupeKey = `${pref.user_id}:weekly:${periodStartStr}`;

      // Dedupe: skip if we already logged this period for this user.
      const { data: existing } = await supabase
        .from("email_log")
        .select("id")
        .eq("dedupe_key", dedupeKey)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      // Resolve user email.
      const { data: userRes } = await supabase.auth.admin.getUserById(
        pref.user_id
      );
      const email = userRes?.user?.email;
      if (!email) {
        skipped++;
        continue;
      }
      const parentName =
        (userRes?.user?.user_metadata?.full_name as string | undefined)?.split(
          " "
        )[0] ?? "";

      // Get user's babies.
      const { data: babies } = await supabase
        .from("babies")
        .select("id, name, birth_date, avatar_emoji")
        .eq("user_id", pref.user_id);

      if (!babies || babies.length === 0) {
        skipped++;
        continue;
      }

      const babyStats: WeeklyReportBabyStats[] = [];
      for (const baby of babies) {
        const { data: sessions } = await supabase
          .from("sleep_sessions")
          .select("*")
          .eq("baby_id", baby.id)
          .gte("start_time", periodStart.toISOString())
          .order("start_time", { ascending: true });

        const list = (sessions ?? []) as SleepSession[];
        if (list.filter((s) => s.duration_min != null).length === 0) continue;

        babyStats.push(
          buildBabyStats(
            list,
            baby.birth_date,
            baby.name,
            baby.avatar_emoji || "👶"
          )
        );
      }

      if (babyStats.length === 0) {
        skipped++;
        continue;
      }

      await resend.emails.send({
        from: FROM,
        to: email,
        subject: "🌙 Seu resumo de sono da semana",
        react: WeeklyReport({
          parentName,
          periodLabel,
          babies: babyStats,
          appUrl,
        }),
      });

      await supabase.from("email_log").insert({
        user_id: pref.user_id,
        kind: "weekly",
        period_start: periodStartStr,
        period_end: periodEndStr,
        dedupe_key: dedupeKey,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      sent++;
    } catch (err) {
      console.error(`[weekly-email] Error for user ${pref.user_id}:`, err);
    }
  }

  return { sent, skipped };
}
