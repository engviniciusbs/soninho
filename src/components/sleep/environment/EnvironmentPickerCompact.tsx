import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Shirt } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getClothingRecommendation,
  SACK_LABELS,
  type SleepSackType,
} from "@/lib/sleep/clothingRecommendation";
import { SACK_OPTIONS } from "./options";
import type { EnvironmentData } from "./types";

// ─── Compact version for SleepTimer ──────────────────────────────────────────
export function EnvironmentPickerCompact({
  value,
  onChange,
}: {
  value: EnvironmentData;
  onChange: (data: EnvironmentData) => void;
}) {
  const temp = value.room_temp_celsius;
  const sackType = (value.sleep_sack_type as SleepSackType) ?? null;
  const togValue = value.sleep_sack_tog;

  function setTemp(t: number | null) {
    onChange({ ...value, room_temp_celsius: t });
  }

  function setSackType(type: SleepSackType) {
    onChange({
      ...value,
      sleep_sack_type: type === sackType ? null : type,
      sleep_sack_tog: type === "none" ? null : togValue,
    });
  }

  const rec = getClothingRecommendation(temp, sackType, togValue);

  return (
    <div className="space-y-3">
      {/* Temperature row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Temp. do quarto</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Diminuir temperatura"
            onClick={() => setTemp(Math.max(10, (temp ?? 22) - 1))}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setTemp(Math.max(10, (temp ?? 22) - 1)); }}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-card/50 text-muted-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ touchAction: "manipulation" }}
          >
            <Minus className="h-3 w-3" aria-hidden="true" />
          </button>
          <span
            className="w-14 text-center text-sm font-semibold tabular-nums"
            aria-live="polite"
          >
            {temp !== null ? `${temp}°C` : "—"}
          </span>
          <button
            type="button"
            aria-label="Aumentar temperatura"
            onClick={() => setTemp(Math.min(40, (temp ?? 22) + 1))}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setTemp(Math.min(40, (temp ?? 22) + 1)); }}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-card/50 text-muted-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ touchAction: "manipulation" }}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
          </button>
          {temp !== null && (
            <button
              type="button"
              aria-label="Limpar temperatura"
              onClick={() => setTemp(null)}
              className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Sack type row */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground shrink-0">Saquinho</span>
        <div className="flex gap-1 flex-1" role="group" aria-label="Saquinho">
          {SACK_OPTIONS.map(({ value: sv, shortLabel }) => (
            <button
              key={sv}
              type="button"
              aria-pressed={sackType === sv || (!sackType && sv === "none")}
              aria-label={SACK_LABELS[sv]}
              onClick={() => setSackType(sv)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSackType(sv); }}
              className={cn(
                "flex-1 rounded-lg py-1 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                (sackType === sv || (!sackType && sv === "none"))
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "border border-border/40 text-muted-foreground hover:text-foreground"
              )}
              style={{ touchAction: "manipulation" }}
            >
              {shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <AnimatePresence>
        {rec && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            aria-live="polite"
          >
            <div className="rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 flex items-start gap-2">
              <Shirt className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground leading-snug">{rec.layers}</p>
                {rec.warning && (
                  <p className="text-[11px] text-amber-400/80 mt-0.5 leading-snug">{rec.warning}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
