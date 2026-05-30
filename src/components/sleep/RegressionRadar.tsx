"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Radar, ShieldCheck, Lightbulb } from "lucide-react";
import { useBaby } from "@/components/providers/BabyProvider";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface RegressionResponse {
  detected: boolean;
  ageWindow: string | null;
  summary: string;
  debtHours: number;
  sleepDropHours: number;
  explanation: string | null;
  tips: string[];
}

export function RegressionRadar() {
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

  const { data, isLoading } = useQuery<RegressionResponse | null>({
    queryKey: ["regression", activeBaby?.id, lastSessionKey],
    queryFn: async () => {
      if (!activeBaby) return null;
      const res = await fetch("/api/ai/regression", {
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
    enabled: !!activeBaby && lastSessionKey !== undefined,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  if (isLoading) {
    return <Skeleton className="h-28 rounded-2xl" />;
  }

  if (!data) return null;

  // ── Calm state ──────────────────────────────────────────────────────────
  if (!data.detected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
            <ShieldCheck className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Radar de regressões</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data.summary}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Alert state ─────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
          <Radar className="h-5 w-5 text-amber-400" aria-hidden="true" />
          <motion.span
            className="absolute inset-0 rounded-xl border border-amber-400/40"
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">Radar de regressões</p>
            {data.ageWindow && (
              <span className="rounded-full border border-amber-500/25 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                {data.ageWindow}
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.explanation ?? data.summary}
          </p>

          {data.tips.length > 0 && (
            <ul className="space-y-1.5 pt-1">
              {data.tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <Lightbulb
                    className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400"
                    aria-hidden="true"
                  />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
}
