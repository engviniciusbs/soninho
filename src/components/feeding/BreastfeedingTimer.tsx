"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Baby } from "lucide-react";
import { useBreastfeedingTimer } from "@/hooks/useBreastfeedingTimer";
import { cn } from "@/lib/utils";

function formatMinSec(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function BreastfeedingTimer() {
  const {
    isRunning,
    activeSide,
    liveLeftSec,
    liveRightSec,
    handleStart,
    handleSwitchSide,
    handleStop,
  } = useBreastfeedingTimer();

  const totalSec = liveLeftSec + liveRightSec;

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15">
        <Baby className="h-7 w-7 text-rose-400" aria-hidden="true" />
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="num-display text-4xl font-bold tabular-nums text-rose-400" aria-live="polite">
          {formatMinSec(totalSec)}
        </span>
        <span className="text-xs text-muted-foreground">
          {isRunning ? "mamada em andamento" : "tempo total"}
        </span>
      </div>

      {/* Side buttons */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {(["LEFT", "RIGHT"] as const).map((side) => {
          const isActive = isRunning && activeSide === side;
          const sec = side === "LEFT" ? liveLeftSec : liveRightSec;
          return (
            <button
              key={side}
              type="button"
              disabled={!isRunning}
              aria-pressed={isActive}
              onClick={() => handleSwitchSide(side)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border py-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                isActive
                  ? "border-rose-500/50 bg-rose-500/10"
                  : "border-border/50 bg-card/40 hover:border-border"
              )}
              style={{ touchAction: "manipulation" }}
            >
              <span className={cn("text-sm font-semibold", isActive ? "text-rose-400" : "text-foreground")}>
                {side === "LEFT" ? "Esquerdo" : "Direito"}
              </span>
              <span className="num-display text-lg font-bold tabular-nums text-muted-foreground">
                {formatMinSec(sec)}
              </span>
              {isActive && (
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-rose-400"
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!isRunning ? (
          <motion.div
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3 w-full max-w-sm"
          >
            <button
              type="button"
              onClick={() => handleStart("LEFT")}
              className="h-11 rounded-2xl bg-rose-500 text-sm font-medium text-white transition-colors hover:bg-rose-500/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Iniciar (Esq.)
            </button>
            <button
              type="button"
              onClick={() => handleStart("RIGHT")}
              className="h-11 rounded-2xl bg-rose-500 text-sm font-medium text-white transition-colors hover:bg-rose-500/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Iniciar (Dir.)
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="stop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            type="button"
            onClick={handleStop}
            className="h-11 w-full max-w-sm rounded-2xl border border-rose-500/40 bg-rose-500/10 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Finalizar mamada
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
