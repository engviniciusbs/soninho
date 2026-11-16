"use client";

import { motion } from "framer-motion";
import { Radar, ShieldCheck, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRegression } from "@/hooks/useRegression";

export function RegressionRadar() {
  const { data, isLoading } = useRegression();

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
