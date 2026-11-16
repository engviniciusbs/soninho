import { getWebPush, PUSH_ICON, sendToSubscription } from "@/lib/notifications/webpush";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatSleepActivityMessage,
  formatFeedingActivityMessage,
} from "@/lib/family/activityMessages";
import { prefIsQuiet } from "@/lib/notifications/selectAlerts";
import type { SleepType, FeedingType } from "@/types";

async function getFamilyRecipients(
  supabase: ReturnType<typeof createAdminClient>,
  babyId: string,
  actorUserId: string
): Promise<Set<string>> {
  const { data: baby } = await supabase
    .from("babies")
    .select("family_id, user_id")
    .eq("id", babyId)
    .single();

  const recipientIds = new Set<string>();
  if (!baby) return recipientIds;

  if (baby.family_id) {
    const { data: members } = await supabase
      .from("family_members")
      .select("user_id")
      .eq("family_id", baby.family_id)
      .neq("user_id", actorUserId);

    for (const m of members ?? []) {
      recipientIds.add(m.user_id);
    }
  } else if (baby.user_id && baby.user_id !== actorUserId) {
    recipientIds.add(baby.user_id);
  }

  return recipientIds;
}

/** Payload `type` of family pushes; only OVERDUE alerts stay on screen (sw.js). */
export const FAMILY_ACTIVITY_PUSH_TYPE = "FAMILY_ACTIVITY";

async function pushToRecipients(
  supabase: ReturnType<typeof createAdminClient>,
  recipientIds: Set<string>,
  payload: string
): Promise<number> {
  const webpush = getWebPush();
  if (!webpush) return 0;

  const now = new Date();
  const { data: prefRows } = await supabase
    .from("notification_preferences")
    .select("user_id, enabled, quiet_hours_start, quiet_hours_end, timezone")
    .in("user_id", [...recipientIds]);
  const prefsByUser = new Map((prefRows ?? []).map((p) => [p.user_id, p]));

  let sent = 0;

  for (const userId of recipientIds) {
    // No row means the defaults: alerts on, quiet hours 22:00 to 07:00.
    const prefs = prefsByUser.get(userId);
    if (prefs && prefs.enabled === false) continue;
    if (
      prefIsQuiet(now, {
        quiet_hours_start: prefs?.quiet_hours_start ?? null,
        quiet_hours_end: prefs?.quiet_hours_end ?? null,
        timezone: prefs?.timezone ?? null,
      })
    ) {
      continue;
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    for (const sub of subs ?? []) {
      if ((await sendToSubscription(webpush, sub, payload, supabase)) === "sent") sent++;
    }
  }

  return sent;
}

interface NotifyFamilyActivityParams {
  babyId: string;
  actorUserId: string;
  action: "started" | "stopped";
  sleepType: SleepType;
  babyName: string;
  actorName: string | null;
  actorRelation: string | null;
}

/** Push to other family members when someone starts/stops sleep. */
export async function notifyFamilySleepActivity(
  params: NotifyFamilyActivityParams
): Promise<number> {
  const {
    babyId,
    actorUserId,
    action,
    sleepType,
    babyName,
    actorName,
    actorRelation,
  } = params;

  if (
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  ) {
    return 0;
  }

  const supabase = createAdminClient();
  const recipientIds = await getFamilyRecipients(supabase, babyId, actorUserId);
  if (recipientIds.size === 0) return 0;

  const title =
    action === "started"
      ? sleepType === "NAP"
        ? "Soneca iniciada"
        : "Sono noturno iniciado"
      : "Sono finalizado";

  const body = formatSleepActivityMessage(
    action,
    actorRelation,
    actorName,
    sleepType,
    babyName
  );

  const payload = JSON.stringify({
    type: FAMILY_ACTIVITY_PUSH_TYPE,
    title,
    body,
    icon: PUSH_ICON,
    tag: `family-sleep-${babyId}-${action}`,
    url: "/app",
  });

  return pushToRecipients(supabase, recipientIds, payload);
}

interface NotifyFamilyFeedingActivityParams {
  babyId: string;
  actorUserId: string;
  action: "started" | "stopped" | "logged";
  feedingType: FeedingType;
  babyName: string;
  actorName: string | null;
  actorRelation: string | null;
}

const FEEDING_TITLES: Record<FeedingType, string> = {
  BOTTLE: "Mamadeira registrada",
  BREAST: "Mamada no peito",
  SOLID: "Refeição de sólidos",
};

/** Push to other family members when someone logs/starts/stops a feeding. */
export async function notifyFamilyFeedingActivity(
  params: NotifyFamilyFeedingActivityParams
): Promise<number> {
  const { babyId, actorUserId, action, feedingType, babyName, actorName, actorRelation } =
    params;

  if (
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  ) {
    return 0;
  }

  const supabase = createAdminClient();
  const recipientIds = await getFamilyRecipients(supabase, babyId, actorUserId);
  if (recipientIds.size === 0) return 0;

  const body = formatFeedingActivityMessage(
    action,
    actorRelation,
    actorName,
    feedingType,
    babyName
  );

  const payload = JSON.stringify({
    type: FAMILY_ACTIVITY_PUSH_TYPE,
    title: FEEDING_TITLES[feedingType],
    body,
    icon: PUSH_ICON,
    tag: `family-feeding-${babyId}-${action}`,
    url: "/feeding",
  });

  return pushToRecipients(supabase, recipientIds, payload);
}
