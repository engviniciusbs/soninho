"use client";

import { useMemo, useState } from "react";
import { format, subMinutes } from "date-fns";

/* ─── Back-date options ───────────────────────────────────────────────────── */
export const OFFSETS = [
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

/** UI state for back-dating a sleep start: a minute offset or a custom time. */
export function useBackdate() {
  const [offset, setOffset] = useState(0);
  const [customTime, setCustomTime] = useState(() => format(new Date(), "HH:mm"));
  const [useCustom, setUseCustom] = useState(false);

  /* Resolved back-date display */
  const startLabel = useMemo(() => {
    if (useCustom) return customTime;
    if (offset === 0) return null;
    return format(subMinutes(new Date(), offset), "HH:mm");
  }, [useCustom, offset, customTime]);

  function selectOffset(value: number) {
    setUseCustom(false);
    setOffset(value);
  }

  function selectCustom() {
    setUseCustom(true);
    setOffset(-1);
    setCustomTime(format(new Date(), "HH:mm"));
  }

  /** ISO start for handleStart, or undefined to start now. */
  function resolveStartIso(): string | undefined {
    if (useCustom) return localTimeToIso(customTime);
    if (offset > 0) return subMinutes(new Date(), offset).toISOString();
    return undefined;
  }

  function reset() {
    setOffset(0);
    setUseCustom(false);
  }

  return {
    offset, customTime, useCustom, startLabel,
    selectOffset, selectCustom, setCustomTime, resolveStartIso, reset,
  };
}
