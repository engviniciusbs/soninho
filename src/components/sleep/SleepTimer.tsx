"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useSleepTimer } from "@/hooks/useSleepTimer";
import { Textarea } from "@/components/ui/textarea";

const SLEEP_TYPES = [
  { value: "NAP" as const, label: "Soneca", icon: Sun },
  { value: "NIGHT_SLEEP" as const, label: "Noturno", icon: Moon },
];

export function SleepTimer() {
  const {
    isRunning,
    elapsed,
    sleepType,
    notes,
    setSleepType,
    setNotes,
    handleStart,
    handleStop,
  } = useSleepTimer();

  return (
    <div className="flex flex-col items-center gap-7">
      {/* Elapsed time display */}
      <AnimatePresence mode="wait">
        {isRunning ? (
          <motion.div
            key="running"
            initial={{ opacity: 0, scale: 0.8, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="text-center"
          >
            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-2">
              {sleepType === "NAP" ? "☀️ Soneca" : "🌙 Sono noturno"} em andamento
            </p>
            <p
              className="text-6xl font-mono font-bold tracking-wider tabular-nums"
              style={{ color: "var(--primary)" }}
            >
              {elapsed}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <p className="text-sm text-muted-foreground">
              Pronto para registrar o sono?
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Big start/stop button */}
      <div className="relative">
        {/* Outer orbit rings when running */}
        <AnimatePresence>
          {isRunning && (
            <>
              <motion.div
                key="ring1"
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full border-2 border-primary/40"
                style={{ margin: "-8px" }}
              />
              <motion.div
                key="ring2"
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute inset-0 rounded-full border border-primary/20"
                style={{ margin: "-16px" }}
              />
            </>
          )}
        </AnimatePresence>

        <motion.button
          onClick={isRunning ? handleStop : handleStart}
          className={`relative flex h-[136px] w-[136px] items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            isRunning
              ? "bg-destructive/90 hover:bg-destructive glow-red"
              : "bg-primary hover:bg-primary/90 glow-primary"
          }`}
          whileTap={{ scale: 0.93 }}
          whileHover={{ scale: 1.03 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          aria-label={isRunning ? "Parar sono" : "Iniciar sono"}
        >
          <AnimatePresence mode="wait">
            {isRunning ? (
              <motion.div
                key="stop"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20"
              >
                <span className="block h-5 w-5 rounded-sm bg-white" aria-hidden="true" />
              </motion.div>
            ) : (
              <motion.div
                key="start"
                initial={{ scale: 0, rotate: 90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -90 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Moon className="h-12 w-12 text-white" aria-hidden="true" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <motion.p
        key={isRunning ? "tap-stop" : "tap-start"}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs font-medium text-muted-foreground tracking-wide"
      >
        {isRunning ? "Toque para parar" : "Toque para iniciar"}
      </motion.p>

      {/* Sleep type animated pill toggle */}
      <AnimatePresence>
        {!isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-[280px]"
          >
            <div
              role="group"
              aria-label="Tipo de sono"
              className="relative flex rounded-full p-1 gap-1"
              style={{ background: "var(--muted)" }}
            >
              {SLEEP_TYPES.map(({ value, label, icon: Icon }) => {
                const isActive = sleepType === value;
                return (
                  <button
                    key={value}
                    onClick={() => setSleepType(value)}
                    aria-pressed={isActive}
                    className={`relative flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sleep-type-pill"
                        className="absolute inset-0 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <Icon
                      className="relative z-10 h-4 w-4"
                      aria-hidden="true"
                    />
                    <span className="relative z-10">{label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes field while running */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-[280px] overflow-hidden"
          >
            <Textarea
              placeholder="Notas rápidas…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-2xl resize-none text-sm bg-muted/50 border-border/50"
              rows={2}
              aria-label="Notas sobre o sono"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
