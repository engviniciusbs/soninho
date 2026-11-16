"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getNotificationPreferences, upsertNotificationPreferences } from "@/lib/supabase/queries/notifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";

/** Per-card in-flight flags, kept here so they survive switching tabs. */
export type NotificationBusyKey = "saving" | "savingWeekly" | "testing";

export interface NotificationPrefs {
  enabled: boolean;
  alertBefore: number;
  quietStart: string;
  quietEnd: string;
  weeklyEmailEnabled: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  alertBefore: 15,
  quietStart: "22:00",
  quietEnd: "07:00",
  weeklyEmailEnabled: true,
};

/** Maps the given fields to `notification_preferences` columns, keeping their order. */
function toRow(p: Partial<NotificationPrefs>) {
  return {
    ...(p.enabled !== undefined && { enabled: p.enabled }),
    ...(p.alertBefore !== undefined && { alert_before_minutes: p.alertBefore }),
    ...(p.quietStart !== undefined && { quiet_hours_start: p.quietStart }),
    ...(p.quietEnd !== undefined && { quiet_hours_end: p.quietEnd }),
    ...(p.weeklyEmailEnabled !== undefined && { weekly_email_enabled: p.weeklyEmailEnabled }),
  };
}

/**
 * Notification preferences (loaded once for the signed-in user) and push
 * subscription controls. `prefs` is the editable local copy: `edit` changes it
 * only locally, `save` applies the fields and upserts just those columns plus
 * the browser timezone. `userId` is resolved by the same initial load.
 */
export function useNotificationSettings() {
  const supabase = createClient();
  const pushState = usePushNotifications();
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [busy, setBusy] = useState<Record<NotificationBusyKey, boolean>>({
    saving: false,
    savingWeekly: false,
    testing: false,
  });

  /** Runs `fn` with the given in-flight flag raised, lowering it afterwards. */
  async function track<T>(key: NotificationBusyKey, fn: () => Promise<T>): Promise<T> {
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      return await fn();
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  }

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await getNotificationPreferences(supabase, user.id);
      if (data) {
        setPrefs({
          enabled: data.enabled ?? DEFAULT_PREFS.enabled,
          alertBefore: data.alert_before_minutes ?? DEFAULT_PREFS.alertBefore,
          quietStart: data.quiet_hours_start ?? DEFAULT_PREFS.quietStart,
          quietEnd: data.quiet_hours_end ?? DEFAULT_PREFS.quietEnd,
          weeklyEmailEnabled: data.weekly_email_enabled ?? DEFAULT_PREFS.weeklyEmailEnabled,
        });
      }
    }
    load();
  }, [supabase]);

  function edit(partial: Partial<NotificationPrefs>) {
    setPrefs((p) => ({ ...p, ...partial }));
  }

  /** Resolves `false` when signed out (nothing is written) or the upsert failed (error toast shown). */
  async function save(partial: Partial<NotificationPrefs>): Promise<boolean> {
    edit(partial);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await upsertNotificationPreferences(supabase, user.id, {
      ...toRow(partial),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    if (error) {
      toast.error("Erro ao salvar preferências");
      return false;
    }
    return true;
  }

  /** Sends a test push; resolves whether the API accepted it, rejects on network errors. */
  async function test(): Promise<boolean> {
    const res = await fetch("/api/notifications/test", { method: "POST" });
    return res.ok;
  }

  const { subscribe, unsubscribe, ...status } = pushState;
  return {
    userId,
    prefs,
    busy,
    track,
    edit,
    save,
    push: { status, enable: subscribe, disable: unsubscribe, test },
  };
}

export type NotificationSettings = ReturnType<typeof useNotificationSettings>;
