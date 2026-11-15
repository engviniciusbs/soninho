"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";
import { OFFSETS } from "./useBackdate";

interface BackdateStartChipsProps {
  offset: number;
  useCustom: boolean;
  customTime: string;
  /** Active chip color (current sleep type). */
  color: string;
  onSelectOffset: (minutes: number) => void;
  onSelectCustom: () => void;
  onCustomTimeChange: (time: string) => void;
}

/** "Iniciou há quanto tempo?" chips plus the custom start-time input. */
export function BackdateStartChips({
  offset, useCustom, customTime, color,
  onSelectOffset, onSelectCustom, onCustomTimeChange,
}: BackdateStartChipsProps) {
  return (
    <div>
      <p className="mb-2 text-center text-[10px] font-medium tracking-widest uppercase text-white/25">
        Iniciou há quanto tempo?
      </p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {OFFSETS.map(({ label, value }) => {
          const act = !useCustom && offset === value;
          return (
            <button
              key={value}
              onClick={() => onSelectOffset(value)}
              aria-pressed={act}
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                act
                  ? "text-white"
                  : "border border-white/10 text-white/35 hover:border-white/20 hover:text-white/55",
              ].join(" ")}
              style={act ? { backgroundColor: color } : undefined}
            >
              {label}
            </button>
          );
        })}

        <button
          onClick={onSelectCustom}
          aria-pressed={useCustom}
          className={[
            "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            useCustom
              ? "text-white"
              : "border border-white/10 text-white/35 hover:border-white/20",
          ].join(" ")}
          style={useCustom ? { backgroundColor: color } : undefined}
        >
          <Clock className="h-3 w-3" aria-hidden />
          Horário
        </button>
      </div>

      <AnimatePresence>
        {useCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-2 flex items-center justify-center gap-2"
          >
            <label htmlFor="backdate-time" className="text-xs text-white/30">
              Às:
            </label>
            <input
              id="backdate-time"
              type="time"
              value={customTime}
              onChange={(e) => onCustomTimeChange(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ colorScheme: "dark" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
