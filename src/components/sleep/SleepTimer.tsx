"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, Square, Leaf, ChevronDown, Clock } from "lucide-react";
import { useSleepTimer } from "@/hooks/useSleepTimer";
import { Textarea } from "@/components/ui/textarea";
import { EnvironmentPickerCompact, type EnvironmentData } from "./EnvironmentPicker";
import { PostSleepReview } from "./PostSleepReview";
import { format, subMinutes } from "date-fns";

const SLEEP_TYPES = [
  { value: "NAP" as const, label: "Soneca", icon: Sun },
  { value: "NIGHT_SLEEP" as const, label: "Noturno", icon: Moon },
];

/** Visual config per sleep type — colors, glows, labels */
const TYPE_CONFIG = {
  NAP: {
    bg: "#f59e0b",
    boxShadow: "0 12px 32px -10px rgba(245,158,11,0.5)",
    ringColor: "rgba(245,158,11,0.4)",
    ringFaint: "rgba(245,158,11,0.18)",
    pillBg: "#f59e0b",
    icon: Sun,
    runningLabel: "Soneca em andamento",
  },
  NIGHT_SLEEP: {
    bg: "#4338ca",
    boxShadow: "0 12px 32px -10px rgba(67,56,202,0.55)",
    ringColor: "rgba(99,102,241,0.4)",
    ringFaint: "rgba(99,102,241,0.18)",
    pillBg: "#4338ca",
    icon: Moon,
    runningLabel: "Sono noturno em andamento",
  },
} as const;

/** Quick-offset options in minutes. 0 = "Agora". */
const OFFSET_OPTIONS = [
  { label: "Agora", value: 0 },
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
] as const;

/** Convert a local HH:MM string (from <input type="time">) to an ISO UTC string for today */
function localTimeInputToIso(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/** Returns "HH:MM" for the current time minus `minutes` */
function offsetToTimeString(minutes: number): string {
  return format(subMinutes(new Date(), minutes), "HH:mm");
}

export function SleepTimer() {
  const {
    isRunning,
    elapsed,
    sleepType,
    notes,
    roomTemp,
    weatherCondition,
    sleepSackType,
    sleepSackTog,
    setSleepType,
    setNotes,
    setRoomTemp,
    setWeatherCondition,
    setSleepSackType,
    setSleepSackTog,
    handleStart,
    handleStop,
  } = useSleepTimer();

  const [envOpen, setEnvOpen] = useState(false);

  // Post-sleep review dialog state
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const [reviewType, setReviewType] = useState<"NAP" | "NIGHT_SLEEP">("NAP");
  const [reviewOpen, setReviewOpen] = useState(false);

  // Back-date state
  const [selectedOffset, setSelectedOffset] = useState<number>(0); // minutes ago
  const [customTime, setCustomTime] = useState<string>(() => format(new Date(), "HH:mm"));
  const [useCustom, setUseCustom] = useState(false);

  const cfg = TYPE_CONFIG[sleepType];
  const TypeIcon = cfg.icon;

  const envData: EnvironmentData = {
    room_temp_celsius: roomTemp,
    weather_condition: weatherCondition,
    sleep_sack_type: sleepSackType,
    sleep_sack_tog: sleepSackTog,
    clothing_description: null,
  };

  function handleEnvChange(data: EnvironmentData) {
    setRoomTemp(data.room_temp_celsius);
    setWeatherCondition(data.weather_condition);
    setSleepSackType(data.sleep_sack_type);
    setSleepSackTog(data.sleep_sack_tog);
  }

  const envFilled = [roomTemp !== null, weatherCondition !== null, sleepSackType !== null]
    .filter(Boolean).length;

  /** Computed display of the resolved start time */
  const resolvedStartDisplay = useMemo(() => {
    if (useCustom) return customTime;
    if (selectedOffset === 0) return null;
    return offsetToTimeString(selectedOffset);
  }, [useCustom, selectedOffset, customTime]);

  async function onMainButtonClick() {
    if (isRunning) {
      const result = await handleStop();
      if (result) {
        setReviewSessionId(result.endedSessionId);
        setReviewType(result.sleepType);
        setReviewOpen(true);
      }
      return;
    }

    let startIso: string | undefined;

    if (useCustom) {
      startIso = localTimeInputToIso(customTime);
    } else if (selectedOffset > 0) {
      startIso = subMinutes(new Date(), selectedOffset).toISOString();
    }

    handleStart(startIso);
    // Reset offset back to "Agora" after starting
    setSelectedOffset(0);
    setUseCustom(false);
  }

  function handleOffsetSelect(minutes: number) {
    setUseCustom(false);
    setSelectedOffset(minutes);
  }

  function handleCustomSelect() {
    setUseCustom(true);
    setSelectedOffset(-1);
    setCustomTime(format(new Date(), "HH:mm"));
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:gap-7">
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
              {cfg.runningLabel}
            </p>
            <p
              className="num-display text-5xl sm:text-6xl font-semibold tabular-nums"
              style={{ color: cfg.bg }}
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
            className="text-center space-y-1"
          >
            <p className="text-sm text-muted-foreground">
              Pronto para registrar o sono?
            </p>
            {resolvedStartDisplay && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-semibold tabular-nums"
                style={{ color: cfg.bg }}
              >
                Iniciado às {resolvedStartDisplay}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Big start/stop button */}
      <div className="relative">
        {/* Pulsing rings when running */}
        <AnimatePresence>
          {isRunning && (
            <>
              <motion.div
                key="ring1"
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full border-2"
                style={{ margin: "-8px", borderColor: cfg.ringColor }}
              />
              <motion.div
                key="ring2"
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1, 1.6, 1], opacity: [0.35, 0, 0.35] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute inset-0 rounded-full border"
                style={{ margin: "-16px", borderColor: cfg.ringFaint }}
              />
            </>
          )}
        </AnimatePresence>

        <motion.button
          onClick={onMainButtonClick}
          className="relative flex h-[120px] w-[120px] sm:h-[136px] sm:w-[136px] items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{
            backgroundColor: isRunning ? "#f87171" : cfg.bg,
            boxShadow: isRunning
              ? "0 12px 32px -10px rgba(248,113,113,0.5)"
              : cfg.boxShadow,
          }}
          whileTap={{ scale: 0.93 }}
          whileHover={{ scale: 1.03 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          aria-label={isRunning ? "Parar sono" : `Iniciar ${sleepType === "NAP" ? "soneca" : "sono noturno"}`}
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
                <Square className="h-6 w-6 fill-white text-white" aria-hidden="true" />
              </motion.div>
            ) : (
              <motion.div
                key={`start-${sleepType}`}
                initial={{ scale: 0, rotate: 90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -90 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <TypeIcon className="h-10 w-10 sm:h-12 sm:w-12 text-white drop-shadow-sm" aria-hidden="true" />
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

      {/* Sleep type pill toggle */}
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
                const pillColor = TYPE_CONFIG[value].pillBg;
                return (
                  <button
                    key={value}
                    onClick={() => setSleepType(value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSleepType(value); }}
                    aria-pressed={isActive}
                    className={`relative flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive ? "text-white" : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={{ touchAction: "manipulation" }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sleep-type-pill"
                        className="absolute inset-0 rounded-full"
                        style={{ backgroundColor: pillColor }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <Icon className="relative z-10 h-4 w-4" aria-hidden="true" />
                    <span className="relative z-10">{label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Back-date chips (idle only) ── */}
      <AnimatePresence>
        {!isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.03 }}
            className="w-full max-w-[280px] space-y-2"
          >
            {/* Label */}
            <p className="text-[11px] font-medium text-muted-foreground text-center tracking-wide uppercase">
              Iniciou há quanto tempo?
            </p>

            {/* Quick offset chips */}
            <div
              role="group"
              aria-label="Tempo de início"
              className="flex flex-wrap justify-center gap-1.5"
            >
              {OFFSET_OPTIONS.map(({ label, value }) => {
                const isActive = !useCustom && selectedOffset === value;
                return (
                  <button
                    key={value}
                    onClick={() => handleOffsetSelect(value)}
                    aria-pressed={isActive}
                    className={`relative rounded-full px-3 py-1 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive
                        ? "text-white"
                        : "text-muted-foreground hover:text-foreground border border-border/60 hover:border-border"
                    }`}
                    style={isActive ? { backgroundColor: cfg.bg } : undefined}
                  >
                    {label}
                  </button>
                );
              })}

              {/* Custom time button */}
              <button
                onClick={handleCustomSelect}
                aria-pressed={useCustom}
                aria-label="Inserir horário personalizado"
                className={`relative flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  useCustom
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground border border-border/60 hover:border-border"
                }`}
                style={useCustom ? { backgroundColor: cfg.bg } : undefined}
              >
                <Clock className="h-3 w-3" aria-hidden="true" />
                Horário
              </button>
            </div>

            {/* Custom time input — visible when "Horário" is selected */}
            <AnimatePresence>
              {useCustom && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <label htmlFor="backdate-time" className="text-xs text-muted-foreground">
                      Horário de início:
                    </label>
                    <input
                      id="backdate-time"
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="rounded-lg border border-border/60 bg-muted/50 px-2 py-1 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ colorScheme: "dark" }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Environment quick-picker (idle only) ── */}
      <AnimatePresence>
        {!isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.06 }}
            className="w-full max-w-[280px] rounded-2xl surface-muted overflow-hidden"
          >
            <button
              type="button"
              aria-expanded={envOpen}
              aria-controls="timer-env-section"
              onClick={() => setEnvOpen(!envOpen)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setEnvOpen(!envOpen); }}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              style={{ touchAction: "manipulation" }}
            >
              <div className="flex items-center gap-2">
                <Leaf className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span className="text-xs font-medium text-muted-foreground">Condições do ambiente</span>
                {envFilled > 0 && (
                  <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {envFilled}
                  </span>
                )}
              </div>
              <motion.div
                animate={{ rotate: envOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {envOpen && (
                <motion.div
                  id="timer-env-section"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden border-t border-border/30"
                >
                  <div className="p-3">
                    <EnvironmentPickerCompact
                      value={envData}
                      onChange={handleEnvChange}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
            <label htmlFor="sleep-notes" className="sr-only">Notas sobre o sono</label>
            <Textarea
              id="sleep-notes"
              placeholder="Notas rápidas…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-2xl resize-none text-sm bg-muted/50 border-border/50"
              rows={2}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <PostSleepReview
        sessionId={reviewSessionId}
        sleepType={reviewType}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  );
}
