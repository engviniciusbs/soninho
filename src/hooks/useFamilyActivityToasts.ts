"use client";

import { useEffect, useRef } from "react";
import { useBaby } from "@/components/providers/BabyProvider";
import { createClient } from "@/lib/supabase/client";
import {
  formatFeedingActivityMessage,
  formatSleepActivityMessage,
} from "@/lib/family/activityMessages";
import { toast } from "sonner";
import type { UnifiedActivityItem } from "@/app/api/family/activity/route";

function messageFor(item: UnifiedActivityItem, babyName: string): string {
  if (item.kind === "feeding") {
    return formatFeedingActivityMessage(
      item.action as "started" | "stopped" | "logged",
      item.actor_relation,
      item.actor_name,
      item.feeding_type ?? "BOTTLE",
      babyName
    );
  }
  return formatSleepActivityMessage(
    item.action as "started" | "stopped",
    item.actor_relation,
    item.actor_name,
    item.sleep_type ?? "NAP",
    babyName
  );
}

/** In-app toast when another caregiver logs sleep or feeding. */
export function useFamilyActivityToasts(enabled: boolean) {
  const { activeBaby } = useBaby();
  const babyId = activeBaby?.id;
  const babyName = activeBaby?.name;
  const lastSeenId = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !babyId || !babyName) return;

    // A different baby has its own latest item: start over so it is not toasted.
    lastSeenId.current = null;
    let cancelled = false;
    const supabase = createClient();

    const userReady = supabase.auth.getUser().then(({ data: { user } }) => {
      userIdRef.current = user?.id ?? null;
    });

    async function poll() {
      const res = await fetch(`/api/family/activity?babyId=${babyId}&limit=1`);
      if (!res.ok || cancelled) return;
      const { data } = (await res.json()) as { data: UnifiedActivityItem[] };
      const latest = data?.[0];
      if (!latest || cancelled) return;

      if (lastSeenId.current === null) {
        lastSeenId.current = latest.id;
        return;
      }

      if (latest.id === lastSeenId.current) return;
      lastSeenId.current = latest.id;

      await userReady;
      if (cancelled || latest.actor_user_id === userIdRef.current) return;

      toast.info(messageFor(latest, babyName!));
    }

    poll();
    const interval = setInterval(poll, 25_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, babyId, babyName]);
}
