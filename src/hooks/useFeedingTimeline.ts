"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getFeedingTimeline } from "@/lib/supabase/feedingQueries";
import { useBaby } from "@/components/providers/BabyProvider";
import type { FeedingTimelineItem } from "@/types";

export function useFeedingTimeline(days: number = 3) {
  const { activeBaby } = useBaby();
  const supabase = createClient();

  return useQuery<FeedingTimelineItem[]>({
    queryKey: ["feeding-timeline", activeBaby?.id, days],
    queryFn: async () => {
      if (!activeBaby) return [];
      const from = new Date();
      from.setDate(from.getDate() - days);
      const { data } = await getFeedingTimeline(supabase, activeBaby.id, from, new Date());
      return data;
    },
    enabled: !!activeBaby,
    staleTime: 30_000,
  });
}
