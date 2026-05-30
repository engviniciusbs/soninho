"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInWeeks } from "date-fns";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { useBaby } from "@/components/providers/BabyProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, Clock, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const confidenceConfig = {
  high: { label: "Na janela", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  medium: { label: "Passou da janela", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  low: { label: "Sem dados", className: "bg-red-500/15 text-red-400 border-red-500/20" },
};

export function AISuggestionCard() {
  const { data: suggestion, isLoading, error } = useAISuggestions();
  const { activeBaby } = useBaby();
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [voting, setVoting] = useState(false);

  async function handleVote(value: "up" | "down") {
    if (!activeBaby || !suggestion || voting || vote) return;
    setVote(value);
    setVoting(true);
    try {
      await fetch("/api/suggestions/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyId: activeBaby.id,
          vote: value,
          suggestedTime: suggestion.suggestedNapTime ?? null,
          windowStart: suggestion.windowStart ?? null,
          windowEnd: suggestion.windowEnd ?? null,
          ageWeeks: differenceInWeeks(
            new Date(),
            new Date(activeBaby.birth_date)
          ),
        }),
      });
    } catch {
      // Non-blocking — keep optimistic state
    } finally {
      setVoting(false);
    }
  }

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
              <span className="num-display text-xl font-semibold tabular-nums">{suggestion.suggestedNapTime}</span>
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

          {/* Feedback */}
          <div className="flex items-center gap-2 pt-1">
            <AnimatePresence mode="wait" initial={false}>
              {vote ? (
                <motion.span
                  key="thanks"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400"
                >
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Obrigado pelo feedback!
                </motion.span>
              ) : (
                <motion.div
                  key="ask"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-[11px] text-muted-foreground">
                    Foi útil?
                  </span>
                  <button
                    type="button"
                    onClick={() => handleVote("up")}
                    disabled={voting}
                    aria-label="Sugestão foi útil"
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg border border-border/50 text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVote("down")}
                    disabled={voting}
                    aria-label="Sugestão não foi útil"
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg border border-border/50 text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
