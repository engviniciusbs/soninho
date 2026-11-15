"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getLastSleepSession } from "@/lib/supabase/queries";
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
  /** Wall-clock time (ms) at which elapsedMinutes was last computed. */
  now: number;
  isLoading: boolean;
}

export function useWakeWindow(): WakeWindowData {
  const supabase = createClient();
  const { activeBaby } = useBaby();
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [now, setNow] = useState(() => Date.now());

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

  useEffect(() => {
    if (!lastSleepEnd) return;
    const end = new Date(lastSleepEnd).getTime();
    function update() {
      const t = Date.now();
      setNow(t);
      setElapsedMinutes(Math.max(0, (t - end) / 60000));
    }
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [lastSleepEnd]);

  const status = getWakeWindowStatus(elapsedMinutes, range);
  const minutesUntilNextNap = getMinutesUntilNextNap(elapsedMinutes, range);

  return {
    elapsedMinutes,
    status,
    range,
    minutesUntilNextNap,
    lastSleepEnd,
    now,
    isLoading,
  };
}
