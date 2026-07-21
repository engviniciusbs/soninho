"use client";

import { motion } from "framer-motion";
import { Clock, Milk } from "lucide-react";
import { useFeedingSuggestion } from "@/hooks/useFeedingSuggestion";
import { useFeedingStore } from "@/store/feedingStore";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const confidenceConfig = {
  high: {
    label: "Boa previsão",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  },
  medium: {
    label: "Estimativa",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  },
  low: {
    label: "Poucos dados",
    className: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  },
};

export function FeedingSuggestionCard() {
  const { data: suggestion, isLoading } = useFeedingSuggestion();
  const { isRunning } = useFeedingStore();

  if (isRunning) return null;
  if (isLoading) return <Skeleton className="h-32 rounded-2xl" />;
  if (!suggestion || !suggestion.suggestedTime) return null;

  const isOverdue = suggestion.suggestedTime === "Assim que possível";
  const confidence = confidenceConfig[suggestion.confidence];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="rounded-2xl border border-sky-500/20 bg-sky-500/6 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15">
          <Milk className="h-5 w-5 text-sky-400" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">
              {isOverdue ? "Hora da próxima mamada" : "Próxima mamada"}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium border",
                confidence.className
              )}
            >
              {confidence.label}
            </span>
          </div>

          <div
            className={cn(
              "flex items-center gap-2",
              isOverdue ? "text-amber-400" : "text-sky-400"
            )}
          >
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="num-display text-xl font-semibold tabular-nums">
              {isOverdue ? "Agora" : suggestion.suggestedTime}
            </span>
            {!isOverdue && suggestion.minutesUntilSuggested > 0 && (
              <span className="text-xs text-muted-foreground font-medium">
                (~{suggestion.minutesUntilSuggested} min)
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {suggestion.reasoning}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
