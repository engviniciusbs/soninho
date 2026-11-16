import { Sun, Moon } from "lucide-react";
import { formatDuration } from "@/lib/utils";

/* ─── Ring geometry ───────────────────────────────────────────────────────── */
export const SZ = 288;
export const CX = SZ / 2; // 144
export const CY = SZ / 2; // 144
export const R = 112;         // main ring radius
export const R_INNER = 96;    // decorative inner ring
export const R_BUBBLE = 143;  // bubble orbit radius (just outside ring)
export const BTN_R = 78;      // center button radius

/* ─── Math helpers ────────────────────────────────────────────────────────── */
export function polar(r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

export function dateToAngle(d: Date): number {
  return ((d.getHours() * 60 + d.getMinutes()) / 1440) * 360;
}

/** Whole-minute countdown for the center display (avoids floats like 119.78505). */
export function formatCountdown(minutes: number): string {
  const m = Math.max(0, Math.ceil(minutes));
  if (m <= 0) return "Agora";
  if (m < 60) return `${m} min`;
  return formatDuration(m);
}

/* ─── Type / status config ────────────────────────────────────────────────── */
export const TCFG = {
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

export type TimerSleepType = keyof typeof TCFG;
export type TypeConfig = (typeof TCFG)[TimerSleepType];

const STATUS_ARC: Record<string, string> = {
  green: "#34d399",
  yellow: "#fbbf24",
  red: "#f87171",
};

export function arcColorFor(status: string): string {
  return STATUS_ARC[status] ?? "#6366f1";
}

/* ─── Bubble visual positions (upper arc: -45°, 0°, +45°) ────────────────── */
export const BUBBLE_SLOTS = [-42, 0, 42] as const;
