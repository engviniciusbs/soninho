"use client";

import { useQuery } from "@tanstack/react-query";
import { useBaby } from "@/components/providers/BabyProvider";
import { useSleepStore } from "@/store/sleepStore";
import { createClient } from "@/lib/supabase/client";
import type { AISuggestion } from "@/types";

export function useAISuggestions() {
  const { activeBaby } = useBaby();
  const { isRunning, activeBabyId } = useSleepStore();
  const supabase = createClient();

  const sleepingForActiveBaby =
    isRunning &&
    !!activeBaby &&
    (!activeBabyId || activeBabyId === activeBaby.id);

  // Fetch the last completed session so we can key the suggestion by it.
  // When the last sleep data changes (new nap ends), we get a fresh suggestion.
  // When nothing changes, the cached result is reused regardless of page refreshes.
  const { data: lastSessionKey } = useQuery<string | null>({
    queryKey: ["last-session-key", activeBaby?.id],
    queryFn: async () => {
      if (!activeBaby) return null;
      const { data } = await supabase
        .from("sleep_sessions")
        .select("id, end_time")
        .eq("baby_id", activeBaby.id)
        .not("end_time", "is", null)
        .order("end_time", { ascending: false })
        .limit(1)
        .single();
      // Key = "<session_id>:<end_time>" — only changes when a new sleep ends
      return data ? `${data.id}:${data.end_time}` : "no-data";
    },
    enabled: !!activeBaby,
    staleTime: 2 * 60 * 1000,
  });

  return useQuery<AISuggestion | null>({
    // Query key includes the last session anchor so the suggestion is stable
    // until actual sleep data changes.
    queryKey: ["ai-suggestion", activeBaby?.id, lastSessionKey],
    queryFn: async () => {
      if (!activeBaby) return null;
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyId: activeBaby.id,
          // Send the browser's timezone so the server formats dates correctly.
          // Without this, Vercel (UTC) shows times 3h ahead of Brazil (UTC-3).
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled:
      !!activeBaby && lastSessionKey !== undefined && !sleepingForActiveBaby,
    staleTime: 60 * 60 * 1000, // 1 hour — same last-sleep data = same suggestion
    gcTime: 2 * 60 * 60 * 1000, // keep in cache 2 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false, // don't re-fetch on every component mount
  });
}
