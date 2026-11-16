"use client";

import { useQuery } from "@tanstack/react-query";
import { useBaby } from "@/components/providers/BabyProvider";
import { createClient } from "@/lib/supabase/client";
import {
  shouldRequestRegressionAi,
  markRegressionAiRequested,
  shouldMarkRegressionAi,
} from "@/lib/sleep/regressionAiGate";

export interface RegressionResponse {
  detected: boolean;
  ageWindow: string | null;
  summary: string;
  debtHours: number;
  sleepDropHours: number;
  explanation: string | null;
  tips: string[];
}

/**
 * Regression detection of the active baby (`/api/ai/regression`, built on
 * `src/lib/sleep/regression.ts`). Shared by the full radar and the home notice:
 * same query keys, so both read one cached result.
 */
export function useRegression() {
  const { activeBaby } = useBaby();
  const supabase = createClient();

  // Anchor the query to the latest completed sleep so the (LLM-backed) result
  // is stable until new sleep data arrives.
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
      return data ? `${data.id}:${data.end_time}` : "no-data";
    },
    enabled: !!activeBaby,
    staleTime: 2 * 60 * 1000,
  });

  return useQuery<RegressionResponse | null>({
    queryKey: ["regression", activeBaby?.id, lastSessionKey],
    queryFn: async () => {
      if (!activeBaby) return null;
      // The LLM explanation (which consumes shared AI quota) is requested at
      // most once per baby per day; later opens get the deterministic result.
      const withAi = shouldRequestRegressionAi(activeBaby.id);
      const res = await fetch("/api/ai/regression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyId: activeBaby.id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          withAi,
        }),
      });
      if (!res.ok) return null;
      const json: RegressionResponse = await res.json();
      if (shouldMarkRegressionAi(withAi, json)) {
        markRegressionAiRequested(activeBaby.id);
      }
      return json;
    },
    enabled: !!activeBaby && lastSessionKey !== undefined,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
