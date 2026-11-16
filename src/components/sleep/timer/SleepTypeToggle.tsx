"use client";

import { motion } from "framer-motion";
import { TCFG, type TimerSleepType } from "./config";

interface SleepTypeToggleProps {
  sleepType: TimerSleepType;
  /** Locked while a session is running. */
  isRunning: boolean;
  onChange: (type: TimerSleepType) => void;
}

/** Pill toggle between nap and night sleep. */
export function SleepTypeToggle({ sleepType, isRunning, onChange }: SleepTypeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Tipo de sono"
      className="flex flex-1 rounded-full p-0.5"
      style={{ background: "rgba(255,255,255,0.06)" }}
    >
      {(["NAP", "NIGHT_SLEEP"] as const).map((type) => {
        const tc = TCFG[type];
        const active = sleepType === type;
        return (
          <button
            key={type}
            onClick={() => !isRunning && onChange(type)}
            disabled={isRunning}
            aria-pressed={active}
            className={[
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "text-white" : "text-white/35",
              isRunning ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            {active && (
              <motion.div
                layoutId="type-pill"
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: tc.color }}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <tc.icon className="relative z-10 h-3.5 w-3.5" aria-hidden />
            <span className="relative z-10">{tc.label}</span>
          </button>
        );
      })}
    </div>
  );
}
