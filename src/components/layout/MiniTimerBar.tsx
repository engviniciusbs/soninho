"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useSleepStore } from "@/store/sleepStore";
import { formatElapsed } from "@/lib/utils";

export function MiniTimerBar() {
  const { isRunning, startTime, sleepType } = useSleepStore();
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (!isRunning || !startTime) return;
    const update = () => setElapsed(formatElapsed(startTime));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const isNap = sleepType === "NAP";
  const accent = isNap ? "#f59e0b" : "#818cf8";
  const TypeIcon = isNap ? Sun : Moon;

  return (
    <AnimatePresence>
      {isRunning && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div
            aria-live="polite"
            aria-label={`${isNap ? "Soneca" : "Sono noturno"} em andamento por ${elapsed}`}
            className="flex items-center justify-center gap-2.5 border-b border-border bg-secondary/60 px-4 py-2 text-sm font-medium"
          >
            {/* Pulsing dot */}
            <motion.div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: accent }}
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            />
            <TypeIcon className="h-3.5 w-3.5" style={{ color: accent }} aria-hidden="true" />
            <span className="text-muted-foreground">
              {isNap ? "Soneca" : "Sono noturno"} em andamento
            </span>
            <span className="num-display font-semibold tabular-nums" style={{ color: accent }}>
              {elapsed}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
