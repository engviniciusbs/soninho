import { createAdminClient } from "@/lib/supabase/admin";
import { getReportPeriod, DEFAULT_REPORT_TIMEZONE } from "@/lib/email/reportPeriod";
import { getResendClient, sendSleepReport } from "@/lib/email/sleepReport";

const PERIOD_DAYS = 7;

export async function dispatchWeeklyEmails(): Promise<{
  sent: number;
  skipped: number;
}> {
  const resend = getResendClient();
  const supabase = createAdminClient();

  const now = new Date();

  let sent = 0;
  let skipped = 0;

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, timezone")
    .eq("weekly_email_enabled", true);

  if (!prefs || prefs.length === 0) return { sent: 0, skipped: 0 };

  for (const pref of prefs) {
    try {
      const timeZone = pref.timezone || DEFAULT_REPORT_TIMEZONE;
      const periodStartStr = getReportPeriod(now, PERIOD_DAYS, timeZone).startKey;
      const dedupeKey = `${pref.user_id}:weekly:${periodStartStr}`;

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

      const { data: babies } = await supabase
        .from("babies")
        .select("id, name, birth_date, avatar_emoji")
        .eq("user_id", pref.user_id);

      if (!babies || babies.length === 0) {
        skipped++;
        continue;
      }

      const result = await sendSleepReport({
        supabase,
        resend,
        userId: pref.user_id,
        email,
        parentName,
        periodDays: PERIOD_DAYS,
        kind: "weekly",
        dedupeKey,
        timeZone,
        babies,
      });

      if (result.ok) sent++;
      else skipped++;
    } catch (err) {
      console.error(`[weekly-email] Error for user ${pref.user_id}:`, err);
      skipped++;
    }
  }

  return { sent, skipped };
}
