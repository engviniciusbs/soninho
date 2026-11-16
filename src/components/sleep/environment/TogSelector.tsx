import { motion, AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOG_OPTIONS, type SleepSackType } from "@/lib/sleep/clothingRecommendation";

// ─── TOG selector — only when a sack is selected ──────────────────────────────
export function TogSelector({
  sackType,
  value,
  onSelect,
}: {
  sackType: SleepSackType | null;
  value: number | null;
  onSelect: (tog: number) => void;
}) {
  return (
    <AnimatePresence>
      {sackType && sackType !== "none" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2 overflow-hidden"
        >
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              TOG do saquinho
            </label>
            <Info className="h-3 w-3 text-muted-foreground/40" aria-hidden="true" />
          </div>
          <div
            role="group"
            aria-label="TOG do saquinho"
            className="flex gap-1.5 flex-wrap"
          >
            {TOG_OPTIONS.map((t) => {
              const isActive = value === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={isActive}
                  aria-label={`TOG ${t}`}
                  onClick={() => onSelect(t)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(t); }}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "border border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                  style={{ touchAction: "manipulation" }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
