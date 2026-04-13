import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWakeWindowRange } from "@/lib/sleep/wakeWindows";
import { differenceInWeeks, differenceInMinutes, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

webpush.setVapidDetails(
  process.env.VAPID_CONTACT_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface NotificationPayload {
  title: string;
  body: string;
  icon: string;
  tag: string;
  url: string;
}

function isInQuietHours(
  now: Date,
  timezone: string,
  start: string, // "HH:MM"
  end: string
): boolean {
  const zoned = toZonedTime(now, timezone);
  const hh = zoned.getHours();
  const mm = zoned.getMinutes();
  const currentMinutes = hh * 60 + mm;

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (startMin <= endMin) {
    return currentMinutes >= startMin && currentMinutes < endMin;
  }
  // Wraps midnight (e.g., 22:00 - 07:00)
  return currentMinutes >= startMin || currentMinutes < endMin;
}

export async function dispatchNotifications(): Promise<number> {
  const supabase = createAdminClient();
  const now = new Date();
  let sentCount = 0;

  // Get all users with notifications enabled
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("enabled", true);

  if (!prefs || prefs.length === 0) return 0;

  for (const pref of prefs) {
    try {
      if (
        isInQuietHours(
          now,
          pref.timezone || "America/Sao_Paulo",
          pref.quiet_hours_start || "22:00",
          pref.quiet_hours_end || "07:00"
        )
      ) {
        continue;
      }

      // Get user's babies
      const { data: babies } = await supabase
        .from("babies")
        .select("id, birth_date")
        .eq("user_id", pref.user_id);

      if (!babies || babies.length === 0) continue;

      // Get user's active push subscriptions
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", pref.user_id)
        .eq("is_active", true);

      if (!subs || subs.length === 0) continue;

      for (const baby of babies) {
        // Check if baby is currently sleeping
        const { data: activeSleep } = await supabase
          .from("sleep_sessions")
          .select("id")
          .eq("baby_id", baby.id)
          .is("end_time", null)
          .limit(1);

        if (activeSleep && activeSleep.length > 0) continue;

        // Get last completed session
        const { data: lastSession } = await supabase
          .from("sleep_sessions")
          .select("id, end_time")
          .eq("baby_id", baby.id)
          .not("end_time", "is", null)
          .order("end_time", { ascending: false })
          .limit(1)
          .single();

        if (!lastSession?.end_time) continue;

        const ageWeeks = differenceInWeeks(now, parseISO(baby.birth_date));
        const range = getWakeWindowRange(ageWeeks);
        const lastEnd = parseISO(lastSession.end_time);
        const elapsedMin = differenceInMinutes(now, lastEnd);
        const alertBefore = pref.alert_before_minutes || 15;

        // NAP_SOON: approaching wake window limit
        const napSoonThreshold = range.maxMinutes - alertBefore;
        if (elapsedMin >= napSoonThreshold && elapsedMin < range.maxMinutes) {
          const dedupeKey = `${baby.id}:${lastSession.id}:NAP_SOON`;
          const minutesLeft = range.maxMinutes - elapsedMin;

          const sent = await sendIfNew(supabase, {
            userId: pref.user_id,
            babyId: baby.id,
            sessionId: lastSession.id,
            eventType: "NAP_SOON",
            dedupeKey,
            subscriptions: subs,
            payload: {
              title: "🌙 Hora da soneca chegando!",
              body: `Faltam ~${minutesLeft} min para a janela de sono. Prepare o ambiente!`,
              icon: "/icon.svg",
              tag: `nap-soon-${baby.id}`,
              url: "/",
            },
          });
          if (sent) sentCount++;
        }

        // OVERDUE: past wake window
        if (elapsedMin >= range.maxMinutes) {
          const dedupeKey = `${baby.id}:${lastSession.id}:OVERDUE`;
          const overMin = elapsedMin - range.maxMinutes;

          const sent = await sendIfNew(supabase, {
            userId: pref.user_id,
            babyId: baby.id,
            sessionId: lastSession.id,
            eventType: "OVERDUE",
            dedupeKey,
            subscriptions: subs,
            payload: {
              title: "⚠️ Passou da janela de sono!",
              body: `Já passou ${overMin} min da janela ideal. O bebê pode estar muito cansado.`,
              icon: "/icon.svg",
              tag: `overdue-${baby.id}`,
              url: "/",
            },
          });
          if (sent) sentCount++;
        }
      }
    } catch (err) {
      console.error(`[dispatch] Error for user ${pref.user_id}:`, err);
    }
  }

  return sentCount;
}

async function sendIfNew(
  supabase: ReturnType<typeof createAdminClient>,
  opts: {
    userId: string;
    babyId: string;
    sessionId: string;
    eventType: string;
    dedupeKey: string;
    subscriptions: { endpoint: string; p256dh: string; auth: string }[];
    payload: NotificationPayload;
  }
): Promise<boolean> {
  // Check deduplication
  const { data: existing } = await supabase
    .from("notification_events")
    .select("id")
    .eq("dedupe_key", opts.dedupeKey)
    .limit(1);

  if (existing && existing.length > 0) return false;

  // Send to all subscriptions
  const payloadStr = JSON.stringify(opts.payload);
  let anySent = false;

  for (const sub of opts.subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payloadStr
      );
      anySent = true;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        // Subscription expired, deactivate
        await supabase
          .from("push_subscriptions")
          .update({ is_active: false })
          .eq("endpoint", sub.endpoint);
      }
      console.error(`[push] Failed for ${sub.endpoint}:`, err);
    }
  }

  if (anySent) {
    await supabase.from("notification_events").insert({
      user_id: opts.userId,
      baby_id: opts.babyId,
      session_id: opts.sessionId,
      event_type: opts.eventType,
      dedupe_key: opts.dedupeKey,
      sent_at: new Date().toISOString(),
      status: "sent",
    });
  }

  return anySent;
}
