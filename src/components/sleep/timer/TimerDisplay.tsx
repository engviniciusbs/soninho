"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Square } from "lucide-react";
import { BTN_R, TCFG, formatCountdown, type TimerSleepType } from "./config";

interface TimerDisplayProps {
  isRunning: boolean;
  /** "HH:MM:SS" since the session started. */
  elapsed: string;
  sleepType: TimerSleepType;
  wwLoading: boolean;
  minutesUntilNextNap: number;
  /** Kind of the AI suggestion, when there is one. */
  aiKind: string | undefined;
  arcColor: string;
  /** Back-dated start shown under the countdown ("desde HH:mm"). */
  startLabel: string | null;
  onPress: () => void;
}

/** Center button of the ring: countdown while idle, elapsed time while running. */
export function TimerDisplay({
  isRunning, elapsed, sleepType, wwLoading, minutesUntilNextNap,
  aiKind, arcColor, startLabel, onPress,
}: TimerDisplayProps) {
  const cfg = TCFG[sleepType];

  /* ── Center display text ──────────────────────────────────────────────── */
  const centerMain = isRunning
    ? elapsed
    : wwLoading
    ? "—"
    : formatCountdown(minutesUntilNextNap);

  const centerSub = isRunning
    ? cfg.runLabel
    : !wwLoading && minutesUntilNextNap <= 0
    ? aiKind === "NIGHT_SLEEP"
      ? "hora de dormir!"
      : "hora da soneca!"
    : aiKind === "NIGHT_SLEEP"
    ? "sono noturno"
    : "próxima soneca";

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.button
        onClick={onPress}
        className="relative flex flex-col items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ width: BTN_R * 2, height: BTN_R * 2 }}
        whileTap={{ scale: 0.94 }}
        aria-label={isRunning ? "Parar sono" : `Iniciar ${sleepType === "NAP" ? "soneca" : "sono noturno"}`}
      >
        {/* Radial ambient glow (running) */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              key="amb"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle at 50%, ${cfg.glow} 0%, transparent 70%)`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Button circle face */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: isRunning
              ? `radial-gradient(circle at 50%, ${cfg.faint} 0%, rgba(255,255,255,0.01) 80%)`
              : "radial-gradient(circle at 50%, rgba(255,255,255,0.025) 0%, transparent 80%)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        />

        {/* Content */}
        <AnimatePresence mode="wait">
          {isRunning ? (
            <motion.div
              key="running"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="relative flex flex-col items-center gap-1.5 text-center"
            >
              <span
                className="text-[9px] font-bold tracking-[0.2em] uppercase"
                style={{ color: cfg.color, opacity: 0.8 }}
              >
                {cfg.runLabel}
              </span>
              <span
                className="text-[26px] font-bold tabular-nums leading-none tracking-tight"
                style={{
                  color: "white",
                  textShadow: `0 0 28px ${cfg.glow}`,
                }}
              >
                {elapsed}
              </span>
              <span
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[9px] font-semibold text-white/45"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                <Square className="h-2.5 w-2.5 fill-white/50 text-white/50" aria-hidden />
                parar
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="relative flex flex-col items-center gap-1 text-center px-2"
            >
              <span className="text-[10px] font-medium text-white/35 leading-tight">
                {centerSub}
              </span>

              <AnimatePresence mode="wait">
                <motion.span
                  key={centerMain}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.18 }}
                  className="font-bold tabular-nums leading-none tracking-tight"
                  style={{
                    fontSize: centerMain.length > 5 ? "24px" : "32px",
                    color: minutesUntilNextNap <= 0 && !isRunning ? arcColor : "white",
                  }}
                >
                  {centerMain}
                </motion.span>
              </AnimatePresence>

              {startLabel && (
                <span
                  className="text-[9px] font-semibold tabular-nums mt-0.5"
                  style={{ color: cfg.color }}
                >
                  desde {startLabel}
                </span>
              )}

              <span className="text-[9px] text-white/20 tracking-wide mt-0.5">
                toque para iniciar
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
