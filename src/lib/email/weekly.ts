import { createAdminClient } from "@/lib/supabase/admin";
import { getReportPeriod, DEFAULT_REPORT_TIMEZONE } from "@/lib/email/reportPeriod";
import { getResendClient, sendSleepReport } from "@/lib/email/sleepReport";

const PERIOD_DAYS = 7;

/** Roles that receive the weekly e-mail (viewers do not). */
const RECIPIENT_ROLES = ["owner", "caregiver"];

type ReportBaby = {
  id: string;
  name: string;
  birth_date: string;
  avatar_emoji: string | null;
};

/**
 * Weekly e-mail to every owner and caregiver of each family, with the family's
 * babies. A user without a preference row gets it (the default is on).
 */
export async function dispatchWeeklyEmails(): Promise<{
  sent: number;
  skipped: number;
}> {
  const resend = getResendClient();
  const supabase = createAdminClient();

  const now = new Date();

  let sent = 0;
  let skipped = 0;

  const [{ data: members }, { data: babies }, { data: prefs }] = await Promise.all([
    supabase
      .from("family_members")
      .select("family_id, user_id, role")
      .in("role", RECIPIENT_ROLES),
    supabase
      .from("babies")
      .select("id, name, birth_date, avatar_emoji, family_id")
      .not("family_id", "is", null),
    supabase
      .from("notification_preferences")
      .select("user_id, weekly_email_enabled, timezone"),
  ]);

  const babiesByFamily = new Map<string, ReportBaby[]>();
  for (const b of babies ?? []) {
    const list = babiesByFamily.get(b.family_id!) ?? [];
    list.push({ id: b.id, name: b.name, birth_date: b.birth_date, avatar_emoji: b.avatar_emoji });
    babiesByFamily.set(b.family_id!, list);
  }

  const babiesByUser = new Map<string, ReportBaby[]>();
  for (const m of members ?? []) {
    const list = babiesByUser.get(m.user_id) ?? [];
    for (const b of babiesByFamily.get(m.family_id) ?? []) {
      if (!list.some((x) => x.id === b.id)) list.push(b);
    }
    babiesByUser.set(m.user_id, list);
  }

  const prefByUser = new Map((prefs ?? []).map((p) => [p.user_id, p]));

  for (const [userId, userBabies] of babiesByUser) {
    const pref = prefByUser.get(userId);
    if (pref && pref.weekly_email_enabled === false) continue;

    try {
      if (userBabies.length === 0) {
        skipped++;
        continue;
      }

      const timeZone = pref?.timezone || DEFAULT_REPORT_TIMEZONE;
      const periodStartStr = getReportPeriod(now, PERIOD_DAYS, timeZone, {
        endsYesterday: true,
      }).startKey;
      const dedupeKey = `${userId}:weekly:${periodStartStr}`;

      const { data: userRes } = await supabase.auth.admin.getUserById(userId);
      const email = userRes?.user?.email;
      if (!email) {
        skipped++;
        continue;
      }
      const parentName =
        (userRes?.user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "";

      const result = await sendSleepReport({
        supabase,
        resend,
        userId,
        email,
        parentName,
        periodDays: PERIOD_DAYS,
        kind: "weekly",
        dedupeKey,
        timeZone,
        babies: userBabies,
      });

      if (result.ok) sent++;
      else skipped++;
    } catch (err) {
      console.error(`[weekly-email] Error for user ${userId}:`, err);
      skipped++;
    }
  }

  return { sent, skipped };
}
