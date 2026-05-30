"use client";

import { useEffect, useRef } from "react";
import { useBaby } from "@/components/providers/BabyProvider";
import { createClient } from "@/lib/supabase/client";
import { formatSleepActivityMessage } from "@/lib/family/activityMessages";
import { toast } from "sonner";
import type { SleepActivityLog, SleepType } from "@/types";

/** In-app toast when another caregiver starts/stops sleep. */
export function useFamilyActivityToasts(enabled: boolean) {
  const { activeBaby } = useBaby();
  const lastSeenId = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !activeBaby) return;

    const supabase = createClient();

    async function initUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userIdRef.current = user?.id ?? null;
    }
    initUser();

    async function poll() {
      const res = await fetch(
        `/api/family/activity?babyId=${activeBaby!.id}&limit=1`
      );
      if (!res.ok) return;
      const { data } = (await res.json()) as { data: SleepActivityLog[] };
      const latest = data?.[0];
      if (!latest) return;

      if (lastSeenId.current === null) {
        lastSeenId.current = latest.id;
        return;
      }

      if (latest.id === lastSeenId.current) return;
      lastSeenId.current = latest.id;

      if (latest.actor_user_id === userIdRef.current) return;

      const msg = formatSleepActivityMessage(
        latest.action,
        latest.actor_relation,
        latest.actor_name,
        (latest.sleep_type as SleepType) ?? "NAP",
        activeBaby!.name
      );
      toast.info(msg);
    }

    poll();
    const interval = setInterval(poll, 25_000);
    return () => clearInterval(interval);
  }, [enabled, activeBaby]);
}
