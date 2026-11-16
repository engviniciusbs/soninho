"use client";

import { useNow } from "@/hooks/useNow";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getLastSleepSession } from "@/lib/supabase/queries/sleep";
import { useBaby } from "@/components/providers/BabyProvider";
import { getBabyAge } from "@/lib/utils";
import {
  getWakeWindowRange,
  getWakeWindowStatus,
  getMinutesUntilNextNap,
  type WakeWindowStatus,
} from "@/lib/sleep/wakeWindows";
import type { WakeWindowRange } from "@/types";

interface WakeWindowData {
  elapsedMinutes: number;
  status: WakeWindowStatus;
  range: WakeWindowRange;
  minutesUntilNextNap: number;
  lastSleepEnd: string | null;
  isLoading: boolean;
}

export function useWakeWindow(): WakeWindowData {
  const supabase = createClient();
  const { activeBaby } = useBaby();
  // Shared 60s clock; null only on the very first client render.
  const tick = useNow(60_000);

  const { data: lastSession, isLoading } = useQuery({
    queryKey: ["last-session", activeBaby?.id],
    queryFn: async () => {
      if (!activeBaby) return null;
      const { data } = await getLastSleepSession(supabase, activeBaby.id);
      return data;
    },
    enabled: !!activeBaby,
    refetchInterval: 60_000,
  });

  const ageWeeks = activeBaby ? getBabyAge(activeBaby.birth_date).weeks : 12;
  const range = getWakeWindowRange(ageWeeks);

  const lastSleepEnd = lastSession?.end_time ?? null;

  // A lastSleepEnd newer than the 60s tick is taken as "now", so a sleep that
  // just stopped reads 0 immediately instead of waiting for the next tick.
  const elapsedMinutes =
    lastSleepEnd && tick !== null
      ? (Math.max(tick, Date.parse(lastSleepEnd)) - Date.parse(lastSleepEnd)) / 60000
      : 0;

  const status = getWakeWindowStatus(elapsedMinutes, range);
  const minutesUntilNextNap = getMinutesUntilNextNap(elapsedMinutes, range);

  return {
    elapsedMinutes,
    status,
    range,
    minutesUntilNextNap,
    lastSleepEnd,
    isLoading,
  };
}
