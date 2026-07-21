"use client";

import { useQuery } from "@tanstack/react-query";
import { useBaby } from "@/components/providers/BabyProvider";
import { useFeedingStore } from "@/store/feedingStore";
import type { FeedingSuggestion } from "@/types";

export function useFeedingSuggestion() {
  const { activeBaby } = useBaby();
  const { isRunning, activeBabyId } = useFeedingStore();

  const breastfeedingActive =
    isRunning && (!activeBabyId || activeBabyId === activeBaby?.id);

  return useQuery<FeedingSuggestion | null>({
    queryKey: ["feeding-suggestion", activeBaby?.id],
    queryFn: async () => {
      if (!activeBaby) return null;
      const res = await fetch("/api/feeding/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyId: activeBaby.id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!activeBaby && !breastfeedingActive,
    staleTime: 15 * 60 * 1000, // 15 min — refreshed whenever a feed is logged (see invalidations)
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
