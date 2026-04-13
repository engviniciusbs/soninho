"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
            aria-label={`${sleepType === "NAP" ? "Soneca" : "Sono noturno"} em andamento por ${elapsed}`}
            className="flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium"
            style={{
              background: "linear-gradient(90deg, rgba(129,140,248,0.12) 0%, rgba(196,181,253,0.08) 50%, rgba(129,140,248,0.12) 100%)",
              borderBottom: "1px solid rgba(129,140,248,0.15)",
            }}
          >
            {/* Pulsing dot */}
            <motion.div
              className="h-2 w-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            />
            <span className="text-primary/80">
              {sleepType === "NAP" ? "☀️ Soneca" : "🌙 Sono noturno"} em andamento
            </span>
            <span className="font-mono font-bold text-primary tabular-nums">
              {elapsed}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
