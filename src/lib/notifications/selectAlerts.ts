import { differenceInMinutes, differenceInWeeks, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getWakeWindowRange } from "@/lib/sleep/wakeWindows";

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";
export const DEFAULT_QUIET_START = "22:00";
export const DEFAULT_QUIET_END = "07:00";
export const DEFAULT_ALERT_BEFORE_MINUTES = 15;

export type AlertPref = {
  user_id: string;
  enabled: boolean;
  alert_before_minutes: number | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string | null;
};

export type PlannedAlert = {
  userId: string;
  babyId: string;
  sessionId: string;
  eventType: "NAP_SOON" | "OVERDUE";
  dedupeKey: string;
  title: string;
  body: string;
  tag: string;
};

export type SelectAlertsInput = {
  now: Date;
  prefs: AlertPref[];
  members: { family_id: string; user_id: string; role: "owner" | "caregiver" | "viewer" }[];
  babies: { id: string; family_id: string; birth_date: string; name: string }[];
  lastEnded: Record<string, { sessionId: string; endTime: string } | undefined>;
  activeBabyIds: Set<string>;
};

const ALERT_ROLES = new Set(["owner", "caregiver"]);

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Quiet window is [start, end); a start after end wraps midnight (e.g. 22:00–07:00). */
export function isInQuietHours(now: Date, timezone: string, start: string, end: string): boolean {
  const zoned = toZonedTime(now, timezone);
  const current = zoned.getHours() * 60 + zoned.getMinutes();
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s <= e) return current >= s && current < e;
  return current >= s || current < e;
}

function prefIsQuiet(now: Date, pref: AlertPref): boolean {
  const tz = pref.timezone && isValidTimeZone(pref.timezone) ? pref.timezone : DEFAULT_TIMEZONE;
  return isInQuietHours(
    now,
    tz,
    pref.quiet_hours_start || DEFAULT_QUIET_START,
    pref.quiet_hours_end || DEFAULT_QUIET_END
  );
}

/** Pure: decides which nap alerts each eligible family member should receive now. */
export function selectAlerts(input: SelectAlertsInput): PlannedAlert[] {
  const { now } = input;

  // Recipients: enabled prefs, outside their own quiet hours.
  const eligiblePrefs = new Map<string, AlertPref>();
  for (const pref of input.prefs) {
    if (!pref.enabled || eligiblePrefs.has(pref.user_id)) continue;
    if (prefIsQuiet(now, pref)) continue;
    eligiblePrefs.set(pref.user_id, pref);
  }

  const recipientsByFamily = new Map<string, Set<string>>();
  for (const m of input.members) {
    if (!ALERT_ROLES.has(m.role) || !eligiblePrefs.has(m.user_id)) continue;
    let set = recipientsByFamily.get(m.family_id);
    if (!set) recipientsByFamily.set(m.family_id, (set = new Set()));
    set.add(m.user_id);
  }

  const alerts: PlannedAlert[] = [];
  const seen = new Set<string>();

  for (const baby of input.babies) {
    const recipients = recipientsByFamily.get(baby.family_id);
    if (!recipients || recipients.size === 0) continue;
    if (input.activeBabyIds.has(baby.id)) continue;
    const last = input.lastEnded[baby.id];
    if (!last) continue;

    const range = getWakeWindowRange(differenceInWeeks(now, parseISO(baby.birth_date)));
    const elapsed = differenceInMinutes(now, parseISO(last.endTime));

    for (const userId of recipients) {
      const pref = eligiblePrefs.get(userId)!;
      const alertBefore = pref.alert_before_minutes || DEFAULT_ALERT_BEFORE_MINUTES;

      let alert: Omit<PlannedAlert, "dedupeKey" | "userId" | "babyId" | "sessionId"> | null =
        null;
      if (elapsed >= range.maxMinutes) {
        alert = {
          eventType: "OVERDUE",
          title: "⚠️ Passou da janela de sono!",
          body: `Já passou ${elapsed - range.maxMinutes} min da janela ideal. O bebê pode estar muito cansado.`,
          tag: `overdue-${baby.id}`,
        };
      } else if (elapsed >= range.maxMinutes - alertBefore) {
        alert = {
          eventType: "NAP_SOON",
          title: "🌙 Hora da soneca chegando!",
          body: `Faltam ~${range.maxMinutes - elapsed} min para a janela de sono. Prepare o ambiente!`,
          tag: `nap-soon-${baby.id}`,
        };
      }
      if (!alert) continue;

      const dedupeKey = `${baby.id}:${last.sessionId}:${alert.eventType}:${userId}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      alerts.push({ userId, babyId: baby.id, sessionId: last.sessionId, dedupeKey, ...alert });
    }
  }

  return alerts;
}
