import { motion } from "framer-motion";
import { AlertTriangle, Shirt } from "lucide-react";
import {
  getClothingRecommendation,
  type SleepSackType,
} from "@/lib/sleep/clothingRecommendation";

// ─── Recommendation card ──────────────────────────────────────────────────────
export function RecommendationCard({
  temp,
  sackType,
  togValue,
}: {
  temp: number | null;
  sackType: SleepSackType | null;
  togValue: number | null;
}) {
  const rec = getClothingRecommendation(temp, sackType, togValue);

  if (!rec) {
    return (
      <div className="rounded-xl border border-dashed border-border/40 bg-card/20 px-4 py-3">
        <p className="text-xs text-muted-foreground/60 text-center">
          Informe a temperatura do quarto para ver a sugestão de roupa
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20">
          <Shirt className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        </div>
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
          Sugestão de roupa
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{rec.sleepSack}</span>
        </p>
        <p className="text-sm font-medium text-foreground leading-snug">
          {rec.layers}
        </p>
      </div>

      {rec.warning && (
        <div className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" aria-hidden="true" />
          <p className="text-xs text-amber-300/90">{rec.warning}</p>
        </div>
      )}
    </motion.div>
  );
}
