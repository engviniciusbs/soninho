"use client";

import { motion } from "framer-motion";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, Clock } from "lucide-react";

const confidenceConfig = {
  high: { label: "Na janela", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  medium: { label: "Passou da janela", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  low: { label: "Sem dados", className: "bg-red-500/15 text-red-400 border-red-500/20" },
};

export function AISuggestionCard() {
  const { data: suggestion, isLoading, error } = useAISuggestions();

  if (isLoading) {
    return <Skeleton className="h-36 rounded-2xl" />;
  }

  if (error || !suggestion) return null;

  const confidence = confidenceConfig[suggestion.confidence];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="rounded-2xl border border-primary/20 bg-primary/6 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">Próxima soneca</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium border ${confidence.className}`}
            >
              {confidence.label}
            </span>
          </div>

          {suggestion.suggestedNapTime && (
            <div className="flex items-center gap-2 text-primary">
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-lg font-bold tabular-nums">{suggestion.suggestedNapTime}</span>
            </div>
          )}

          {suggestion.windowStart && suggestion.windowEnd && (
            <p className="text-xs text-muted-foreground">
              Janela ideal: {suggestion.windowStart} – {suggestion.windowEnd}
            </p>
          )}

          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {suggestion.reasoning}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
