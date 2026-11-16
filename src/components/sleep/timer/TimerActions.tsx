"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { SleepTypeToggle } from "./SleepTypeToggle";
import type { TimerSleepType } from "./config";

interface TimerActionsProps {
  sleepType: TimerSleepType;
  isRunning: boolean;
  onSleepTypeChange: (type: TimerSleepType) => void;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
}

/** Controls strip under the ring: sleep type toggle + advanced options button. */
export function TimerActions({
  sleepType, isRunning, onSleepTypeChange, advancedOpen, onToggleAdvanced,
}: TimerActionsProps) {
  return (
    <div className="flex w-full max-w-[300px] items-center gap-2">
      <SleepTypeToggle sleepType={sleepType} isRunning={isRunning} onChange={onSleepTypeChange} />

      {/* Expand advanced controls */}
      <button
        onClick={onToggleAdvanced}
        aria-label="Opções avançadas"
        aria-expanded={advancedOpen}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/35 hover:text-white/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <motion.span
          animate={{ rotate: advancedOpen ? 180 : 0 }}
          transition={{ duration: 0.22 }}
          className="flex"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>
    </div>
  );
}
