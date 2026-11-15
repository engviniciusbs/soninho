"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useNow } from "@/hooks/useNow";
import type { AISuggestion } from "@/types";
import { BUBBLE_SLOTS, R_BUBBLE, polar } from "./config";

interface NextSleepSuggestionsProps {
  ai: AISuggestion | null | undefined;
  wwLoading: boolean;
  minutesUntilNextNap: number;
}

/** Floating window bubbles orbiting the ring (AI window, or a wake-window fallback). */
export function NextSleepSuggestions({ ai, wwLoading, minutesUntilNextNap }: NextSleepSuggestionsProps) {
  // Same 60s clock the wake window is computed on. It is null on the server
  // and the first client render, so the clock-dependent fallback time only
  // appears after mount (no hydration mismatch).
  const now = useNow(60_000);

  /* ── Window bubbles from AI suggestion (up to 3, mapped to fixed slots) ── */
  const bubbles = useMemo(() => {
    const candidates: { label: string; emoji: string; secondary?: boolean }[] = [];

    if (ai?.windowStart) candidates.push({ label: ai.windowStart, emoji: "🌤", secondary: true });
    if (ai?.suggestedNapTime) candidates.push({ label: ai.suggestedNapTime, emoji: "☁️" });
    if (ai?.windowEnd) candidates.push({ label: ai.windowEnd, emoji: "⛅", secondary: true });

    if (candidates.length === 0 && !wwLoading && minutesUntilNextNap > 0 && now !== null) {
      const t = new Date(now + minutesUntilNextNap * 60_000);
      candidates.push({ label: format(t, "HH:mm"), emoji: "☁️" });
    }

    return candidates.slice(0, 3).map((c, i) => ({
      ...c,
      pos: polar(R_BUBBLE, BUBBLE_SLOTS[i] ?? 0),
    }));
  }, [ai, minutesUntilNextNap, wwLoading, now]);

  return bubbles.map((b, i) => (
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
  ));
}
