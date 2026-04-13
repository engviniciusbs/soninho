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
  isLoading: boolean;
}

export function useWakeWindow(): WakeWindowData {
  const supabase = createClient();
  const { activeBaby } = useBaby();
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

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

  useEffect(() => {
    if (!lastSession?.end_time) return;
    function update() {
      const end = new Date(lastSession!.end_time!).getTime();
      const now = Date.now();
      setElapsedMinutes(Math.max(0, (now - end) / 60000));
    }
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [lastSession?.end_time]);

  const status = getWakeWindowStatus(elapsedMinutes, range);
  const minutesUntilNextNap = getMinutesUntilNextNap(elapsedMinutes, range);

  return {
    elapsedMinutes,
    status,
    range,
    minutesUntilNextNap,
    lastSleepEnd: lastSession?.end_time ?? null,
    isLoading,
  };
}
