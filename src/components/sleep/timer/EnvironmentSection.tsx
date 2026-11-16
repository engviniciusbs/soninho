"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Leaf } from "lucide-react";
import { EnvironmentPickerCompact, type EnvironmentData } from "../EnvironmentPicker";

interface EnvironmentSectionProps {
  open: boolean;
  onToggle: () => void;
  value: EnvironmentData;
  onChange: (d: EnvironmentData) => void;
}

/** Collapsible "Condições do ambiente" card with the compact environment picker. */
export function EnvironmentSection({ open, onToggle, value, onChange }: EnvironmentSectionProps) {
  const filled = [value.room_temp_celsius, value.weather_condition, value.sleep_sack_type]
    .filter(Boolean).length;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="flex items-center gap-2">
          <Leaf className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
          <span className="text-xs font-medium text-white/40">
            Condições do ambiente
          </span>
          {filled > 0 && (
            <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {filled}
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex"
        >
          <ChevronDown className="h-3.5 w-3.5 text-white/25" aria-hidden />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="p-3">
              <EnvironmentPickerCompact value={value} onChange={onChange} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
