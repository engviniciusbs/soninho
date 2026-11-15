"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { SleepSession } from "@/types";
import { CX, CY, R, R_INNER, SZ, dateToAngle, polar, type TypeConfig } from "./config";

interface TimerRingProps {
  isRunning: boolean;
  /** Minutes awake so far, drawn as the idle wake-window arc. */
  elapsedMinutes: number;
  maxMinutes: number;
  arcColor: string;
  cfg: TypeConfig;
  todaySessions: SleepSession[];
}

/** SVG layer of the orbital ring: dashed rings, arcs, session dots, now marker. */
export function TimerRing({
  isRunning, elapsedMinutes, maxMinutes, arcColor, cfg, todaySessions,
}: TimerRingProps) {
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
  const arcProgress = Math.min(elapsedMinutes / (maxMinutes || 1), 1);

  return (
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
  );
}
