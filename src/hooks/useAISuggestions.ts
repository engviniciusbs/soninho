"use client";

import { useQuery } from "@tanstack/react-query";
import { useBaby } from "@/components/providers/BabyProvider";
import type { AISuggestion } from "@/types";

export function useAISuggestions() {
  const { activeBaby } = useBaby();

  return useQuery<AISuggestion | null>({
    queryKey: ["ai-suggestion", activeBaby?.id],
    queryFn: async () => {
      if (!activeBaby) return null;
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ babyId: activeBaby.id }),
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!activeBaby,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
