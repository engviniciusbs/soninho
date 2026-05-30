import { format, subDays } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, sendSleepReport } from "@/lib/email/sleepReport";

const PERIOD_DAYS = 7;

export async function dispatchWeeklyEmails(): Promise<{
  sent: number;
  skipped: number;
}> {
  const resend = getResendClient();
  const supabase = createAdminClient();

  const now = new Date();
  const periodStart = subDays(now, PERIOD_DAYS);
  const periodStartStr = format(periodStart, "yyyy-MM-dd");

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
