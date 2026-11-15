"use client";

import { useQuery } from "@tanstack/react-query";
import { isToday } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { getRecentSessions } from "@/lib/supabase/queries";
import type { SleepSession } from "@/types";

/** Today's sleep sessions of the baby, drawn as dots on the timer ring. */
export function useTodaySessions(babyId: string | undefined): SleepSession[] {
  const supabase = createClient();
  const { data: todaySessions = [] } = useQuery({
    queryKey: ["today-sessions-ring", babyId],
    queryFn: async (): Promise<SleepSession[]> => {
      if (!babyId) return [];
      const { data } = await getRecentSessions(supabase, babyId, 2);
      return ((data ?? []) as SleepSession[]).filter(
        (s) => isToday(new Date(s.start_time))
      );
    },
    enabled: !!babyId,
    staleTime: 60_000,
  });
  return todaySessions;
}
