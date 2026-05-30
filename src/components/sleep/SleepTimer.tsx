"use client";

/**
 * SleepTimer — Orbital Ring Design
 *
 * Aesthetic: Cosmic Orbital / Deep Space Calm
 * Inspired by Napper's circular wake-window visualizer.
 *
 * Core concept: the ring is the interface. The center IS the start/stop
 * button. Predicted nap windows orbit the ring as floating pill bubbles.
 * Today's sessions become glowing dots on the ring circumference.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Square, ChevronDown, Leaf, Clock } from "lucide-react";
import { useSleepTimer } from "@/hooks/useSleepTimer";
import { useWakeWindow } from "@/hooks/useWakeWindow";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { useBaby } from "@/components/providers/BabyProvider";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getRecentSessions } from "@/lib/supabase/queries";
import { Textarea } from "@/components/ui/textarea";
import { EnvironmentPickerCompact, type EnvironmentData } from "./EnvironmentPicker";
import { PostSleepReview } from "./PostSleepReview";
import { format, subMinutes, isToday } from "date-fns";
import { formatDuration } from "@/lib/utils";
import type { SleepSession } from "@/types";

/* ─── Ring geometry ───────────────────────────────────────────────────────── */
const SZ = 288;
const CX = SZ / 2; // 144
const CY = SZ / 2; // 144
const R = 112;         // main ring radius
const R_INNER = 96;    // decorative inner ring
const R_BUBBLE = 143;  // bubble orbit radius (just outside ring)
const BTN_R = 78;      // center button radius

/* ─── Math helpers ────────────────────────────────────────────────────────── */
function polar(r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function dateToAngle(d: Date): number {
  return ((d.getHours() * 60 + d.getMinutes()) / 1440) * 360;
}

/** Whole-minute countdown for the center display (avoids floats like 119.78505). */
function formatCountdown(minutes: number): string {
  const m = Math.max(0, Math.ceil(minutes));
  if (m <= 0) return "Agora";
  if (m < 60) return `${m} min`;
  return formatDuration(m);
}

/* ─── Type / status config ────────────────────────────────────────────────── */
const TCFG = {
  NAP: {
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.5)",
    faint: "rgba(245,158,11,0.1)",
    icon: Sun,
    label: "Soneca",
    runLabel: "SONECA",
    emoji: "☁️",
  },
  NIGHT_SLEEP: {
    color: "#818cf8",
    glow: "rgba(129,140,248,0.5)",
    faint: "rgba(129,140,248,0.1)",
    icon: Moon,
    label: "Noturno",
    runLabel: "NOTURNO",
    emoji: "🌙",
  },
} as const;

const STATUS_ARC: Record<string, string> = {
  green: "#34d399",
  yellow: "#fbbf24",
  red: "#f87171",
};

/* ─── Bubble visual positions (upper arc: -45°, 0°, +45°) ────────────────── */
const BUBBLE_SLOTS = [-42, 0, 42] as const;

/* ─── Back-date options ───────────────────────────────────────────────────── */
const OFFSETS = [
  { label: "Agora", value: 0 },
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
] as const;

function localTimeToIso(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toISOString();
}

/* ─── Component ───────────────────────────────────────────────────────────── */
export function SleepTimer() {
  const {
    isRunning, elapsed, sleepType,
    notes, roomTemp, weatherCondition, sleepSackType, sleepSackTog,
    setSleepType, setNotes, setRoomTemp, setWeatherCondition,
    setSleepSackType, setSleepSackTog, handleStart, handleStop,
  } = useSleepTimer();

  const { activeBaby } = useBaby();
  const { elapsedMinutes, status, range, minutesUntilNextNap, isLoading: wwLoading } = useWakeWindow();
  const { data: ai } = useAISuggestions();

  const supabase = createClient();
  const { data: todaySessions = [] } = useQuery({
    queryKey: ["today-sessions-ring", activeBaby?.id],
    queryFn: async (): Promise<SleepSession[]> => {
      if (!activeBaby) return [];
      const { data } = await getRecentSessions(supabase, activeBaby.id, 2);
      return ((data ?? []) as SleepSession[]).filter(
        (s) => isToday(new Date(s.start_time))
      );
    },
    enabled: !!activeBaby,
    staleTime: 60_000,
  });

  const cfg = TCFG[sleepType];

  /* UI state */
  const [envOpen, setEnvOpen] = useState(false);
  const [ctrlOpen, setCtrlOpen] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewType, setReviewType] = useState<"NAP" | "NIGHT_SLEEP">("NAP");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [customTime, setCustomTime] = useState(() => format(new Date(), "HH:mm"));
  const [useCustom, setUseCustom] = useState(false);

  /* Resolved back-date display */
  const startLabel = useMemo(() => {
    if (useCustom) return customTime;
    if (offset === 0) return null;
    return format(subMinutes(new Date(), offset), "HH:mm");
  }, [useCustom, offset, customTime]);

  /* ── Window bubbles from AI suggestion (up to 3, mapped to fixed slots) ── */
  const bubbles = useMemo(() => {
    const candidates: { label: string; emoji: string; secondary?: boolean }[] = [];

    if (ai?.windowStart) candidates.push({ label: ai.windowStart, emoji: "🌤", secondary: true });
    if (ai?.suggestedNapTime) candidates.push({ label: ai.suggestedNapTime, emoji: "☁️" });
    if (ai?.windowEnd) candidates.push({ label: ai.windowEnd, emoji: "⛅", secondary: true });

    if (candidates.length === 0 && !wwLoading && minutesUntilNextNap > 0) {
      const t = new Date(Date.now() + minutesUntilNextNap * 60_000);
      candidates.push({ label: format(t, "HH:mm"), emoji: "☁️" });
    }

    return candidates.slice(0, 3).map((c, i) => ({
      ...c,
      pos: polar(R_BUBBLE, BUBBLE_SLOTS[i] ?? 0),
    }));
  }, [ai, minutesUntilNextNap, wwLoading]);

  /* ── Today's session dots on ring ─────────────────────────────────────── */
  const sessionDots = useMemo(() =>
    todaySessions.map((s) => ({
      ...polar(R, dateToAngle(new Date(s.start_time))),
      isNap: s.type === "NAP",
      active: !s.end_time,
    })), [todaySessions]);

  /* ── Now marker ───────────────────────────────────────────────────────── */
  const nowMarker = polar(R, dateToAngle(new Date()));

  /* ── Arc geometry ─────────────────────────────────────────────────────── */
  const circumference = 2 * Math.PI * R;
  const arcProgress = Math.min(elapsedMinutes / (range.maxMinutes || 1), 1);
  const arcColor = STATUS_ARC[status] ?? "#6366f1";

  /* ── Center display text ──────────────────────────────────────────────── */
  const centerMain = isRunning
    ? elapsed
    : wwLoading
    ? "—"
    : formatCountdown(minutesUntilNextNap);

  const centerSub = isRunning
    ? cfg.runLabel
    : !wwLoading && minutesUntilNextNap <= 0
    ? ai?.kind === "NIGHT_SLEEP"
      ? "hora de dormir!"
      : "hora da soneca!"
    : ai?.kind === "NIGHT_SLEEP"
    ? "sono noturno"
    : "próxima soneca";

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  async function onPress() {
    if (isRunning) {
      const r = await handleStop();
      if (r) {
        setReviewId(r.endedSessionId);
        setReviewType(r.sleepType);
        setReviewOpen(true);
      }
      return;
    }
    let iso: string | undefined;
    if (useCustom) iso = localTimeToIso(customTime);
    else if (offset > 0) iso = subMinutes(new Date(), offset).toISOString();
    await handleStart(iso);
    setOffset(0);
    setUseCustom(false);
  }

  const envData: EnvironmentData = {
    room_temp_celsius: roomTemp,
    weather_condition: weatherCondition,
    sleep_sack_type: sleepSackType,
    sleep_sack_tog: sleepSackTog,
    clothing_description: null,
  };

  function onEnvChange(d: EnvironmentData) {
    setRoomTemp(d.room_temp_celsius);
    setWeatherCondition(d.weather_condition);
    setSleepSackType(d.sleep_sack_type);
    setSleepSackTog(d.sleep_sack_tog);
  }

  const envFilled = [roomTemp, weatherCondition, sleepSackType].filter(Boolean).length;

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col items-center gap-4 select-none">

      {/* ════ Orbital Ring ════════════════════════════════════════════════ */}
      <div className="relative mx-auto" style={{ width: SZ, height: SZ }}>

        {/* SVG: dashed ring + arcs + session dots + now marker */}
        <svg
          viewBox={`0 0 ${SZ} ${SZ}`}
          width={SZ}
          height={SZ}
          className="absolute inset-0"
          style={{ overflow: "visible" }}
          aria-hidden="true"
        >
          {/* Outer dashed decorative ring */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
            strokeDasharray="3 10"
          />

          {/* Faint inner ring */}
          <circle
            cx={CX} cy={CY} r={R_INNER}
            fill="none"
            stroke="rgba(255,255,255,0.035)"
            strokeWidth="0.75"
          />

          {/* Wake window progress arc (idle only) */}
          {!isRunning && elapsedMinutes > 0 && (
            <motion.circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={arcColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${arcProgress * circumference} ${circumference}`}
              strokeDashoffset={circumference * 0.25}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${arcProgress * circumference} ${circumference}` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              opacity={0.75}
              transform={`rotate(-90, ${CX}, ${CY})`}
            />
          )}

          {/* Running pulse arc */}
          {isRunning && (
            <motion.circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={cfg.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${0.72 * circumference} ${circumference}`}
              strokeDashoffset={circumference * 0.25}
              transform={`rotate(-90, ${CX}, ${CY})`}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{
                strokeDasharray: `${0.72 * circumference} ${circumference}`,
              }}
              style={{
                filter: `drop-shadow(0 0 8px ${cfg.color})`,
              }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            />
          )}

          {/* Pulsing glow on running arc */}
          {isRunning && (
            <motion.circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={cfg.color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${0.72 * circumference} ${circumference}`}
              strokeDashoffset={circumference * 0.25}
              transform={`rotate(-90, ${CX}, ${CY})`}
              animate={{ opacity: [0.15, 0.35, 0.15] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* Today's session dots */}
          {sessionDots.map((dot, i) => {
            const c = dot.isNap ? "#f59e0b" : "#818cf8";
            return (
              <g key={i}>
                {dot.active && (
                  <circle cx={dot.x} cy={dot.y} r={12}
                    fill={c} opacity={0.15} />
                )}
                <circle
                  cx={dot.x} cy={dot.y}
                  r={dot.active ? 6 : 4.5}
                  fill={c}
                  opacity={dot.active ? 1 : 0.6}
                  style={dot.active ? { filter: `drop-shadow(0 0 7px ${c})` } : undefined}
                />
                {dot.active && (
                  <circle cx={dot.x} cy={dot.y} r={9}
                    fill="none" stroke={c} strokeWidth="1.5" opacity={0.35} />
                )}
              </g>
            );
          })}

          {/* "Now" position marker on ring */}
          <circle
            cx={nowMarker.x} cy={nowMarker.y} r={2.5}
            fill="white" opacity={0.3}
          />
        </svg>

        {/* ── Floating window bubbles (HTML, absolute in ring div) ──────── */}
        {bubbles.map((b, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.1, type: "spring", stiffness: 300, damping: 24 }}
            className="absolute"
            style={{
              left: b.pos.x,
              top: b.pos.y,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className={`flex items-center gap-1 rounded-full px-2.5 py-[5px] text-[11px] font-semibold tabular-nums backdrop-blur-sm whitespace-nowrap ${
                b.secondary
                  ? "bg-white/4 text-white/40"
                  : "bg-white/[0.07] text-white/80"
              }`}
              style={{
                border: `1px dashed ${b.secondary ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)"}`,
                boxShadow: b.secondary ? "none" : "0 0 12px rgba(255,255,255,0.04)",
              }}
            >
              <span className="text-[10px] leading-none">{b.emoji}</span>
              {b.label}
            </div>
          </motion.div>
        ))}

        {/* ── Center button — the main control ──────────────────────────── */}
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
      </div>

      {/* ════ Controls strip ══════════════════════════════════════════════ */}
      <div className="flex w-full max-w-[300px] items-center gap-2">
        {/* Sleep type pill toggle */}
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
                onClick={() => !isRunning && setSleepType(type)}
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

        {/* Expand advanced controls */}
        <button
          onClick={() => setCtrlOpen(!ctrlOpen)}
          aria-label="Opções avançadas"
          aria-expanded={ctrlOpen}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/35 hover:text-white/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <motion.span
            animate={{ rotate: ctrlOpen ? 180 : 0 }}
            transition={{ duration: 0.22 }}
            className="flex"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </button>
      </div>

      {/* ════ Advanced controls (back-date + environment) ═════════════════ */}
      <AnimatePresence>
        {ctrlOpen && !isRunning && (
          <motion.div
            key="ctrl"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden w-full max-w-[300px] space-y-3"
          >
            {/* Back-date chips */}
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
                      onClick={() => { setUseCustom(false); setOffset(value); }}
                      aria-pressed={act}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        act
                          ? "text-white"
                          : "border border-white/10 text-white/35 hover:border-white/20 hover:text-white/55",
                      ].join(" ")}
                      style={act ? { backgroundColor: cfg.color } : undefined}
                    >
                      {label}
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    setUseCustom(true);
                    setOffset(-1);
                    setCustomTime(format(new Date(), "HH:mm"));
                  }}
                  aria-pressed={useCustom}
                  className={[
                    "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    useCustom
                      ? "text-white"
                      : "border border-white/10 text-white/35 hover:border-white/20",
                  ].join(" ")}
                  style={useCustom ? { backgroundColor: cfg.color } : undefined}
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
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ colorScheme: "dark" }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Environment picker */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <button
                type="button"
                onClick={() => setEnvOpen(!envOpen)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <div className="flex items-center gap-2">
                  <Leaf className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                  <span className="text-xs font-medium text-white/40">
                    Condições do ambiente
                  </span>
                  {envFilled > 0 && (
                    <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      {envFilled}
                    </span>
                  )}
                </div>
                <motion.span
                  animate={{ rotate: envOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex"
                >
                  <ChevronDown className="h-3.5 w-3.5 text-white/25" aria-hidden />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {envOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden border-t border-white/5"
                  >
                    <div className="p-3">
                      <EnvironmentPickerCompact value={envData} onChange={onEnvChange} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ Notes (visible while running) ══════════════════════════════ */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-[300px] overflow-hidden"
          >
            <label htmlFor="sleep-notes" className="sr-only">
              Notas sobre o sono
            </label>
            <Textarea
              id="sleep-notes"
              placeholder="Notas rápidas…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-2xl resize-none text-sm border-white/10 bg-white/5 placeholder:text-white/20"
              rows={2}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <PostSleepReview
        sessionId={reviewId}
        sleepType={reviewType}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  );
}
