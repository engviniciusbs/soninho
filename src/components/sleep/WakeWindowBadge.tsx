"use client";

import { motion } from "framer-motion";
import { useWakeWindow } from "@/hooks/useWakeWindow";
import { useSleepStore } from "@/store/sleepStore";
import { formatDuration, formatElapsed } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, AlertTriangle, CheckCircle2, Moon } from "lucide-react";

const statusConfig = {
  green: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    bar: "bg-emerald-400",
    label: "Janela ideal",
    icon: CheckCircle2,
  },
  yellow: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-400",
    bar: "bg-amber-400",
    label: "Quase na hora",
    icon: Clock,
  },
  red: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-400",
    bar: "bg-red-400",
    label: "Passou da hora!",
    icon: AlertTriangle,
  },
};

export function WakeWindowBadge() {
  const { elapsedMinutes, status, range, minutesUntilNextNap, isLoading } =
    useWakeWindow();
  const { isRunning, startTime, sleepType } = useSleepStore();

  if (isLoading) {
    return <Skeleton className="h-28 rounded-2xl" />;
  }

  // ── Sleeping state ────────────────────────────────────────────────────────
  if (isRunning && startTime) {
    const elapsed = formatElapsed(startTime);
    const isNight = sleepType === "NIGHT_SLEEP";
    return (
      <motion.div
        key="sleeping"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20">
              <Moon className="h-4 w-4 text-indigo-300" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {isNight ? "Sono noturno" : "Soneca"}
              </p>
              <p className="text-2xl font-bold tabular-nums text-indigo-300 font-mono">
                {elapsed}
              </p>
            </div>
          </div>
          <div className="rounded-full px-3 py-1 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Dormindo 💤
          </div>
        </div>

        {/* Animated sleep bar */}
        <div className="space-y-1">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/60">
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full bg-indigo-400"
              animate={{ width: ["0%", "100%", "0%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            O widget de vigília será atualizado quando o sono terminar
          </p>
        </div>
      </motion.div>
    );
  }

  // ── Wake window state (normal) ────────────────────────────────────────────
  const config = statusConfig[status];
  const IconComp = config.icon;
  const barWidth = Math.min(100, (elapsedMinutes / range.maxMinutes) * 100);

  return (
    <motion.div
      key="awake"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`rounded-2xl border ${config.border} ${config.bg} p-4`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${config.bg}`}>
            <IconComp className={`h-4.5 w-4.5 ${config.text}`} aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Tempo acordado
            </p>
            <p className={`text-2xl font-bold tabular-nums ${config.text}`}>
              {formatDuration(elapsedMinutes)}
            </p>
          </div>
        </div>

        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}>
          {config.label}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/60">
          <motion.div
            className={`absolute left-0 top-0 h-full rounded-full ${config.bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${barWidth}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          {/* Ideal window marker */}
          <div
            className="absolute top-0 h-full w-0.5 bg-white/30 rounded-full"
            style={{ left: `${(range.minMinutes / range.maxMinutes) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Janela: {formatDuration(range.minMinutes)} – {formatDuration(range.maxMinutes)}</span>
          {minutesUntilNextNap > 0 ? (
            <span className={`font-medium ${config.text}`}>
              ~{Math.round(minutesUntilNextNap)}min p/ próxima
            </span>
          ) : (
            <span className="text-red-400 font-semibold animate-pulse">
              Hora de dormir!
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
