"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type SoninhoLogoMarkProps = {
  /** CSS pixel size (square) */
  size?: number;
  className?: string;
  /** When false, mark is decorative (e.g. next to word “Soninho”) */
  hideLabel?: boolean;
};

/**
 * Soninho symbol: lunar crescent, soft orbit, north-star accent.
 * Designed for dark UI and small-size legibility (favicon / mobile bar).
 */
export function SoninhoLogoMark({
  size = 32,
  className,
  hideLabel = true,
}: SoninhoLogoMarkProps) {
  const uid = useId().replace(/:/g, "");
  const gMoon = `soninho-moon-${uid}`;
  const gOrbit = `soninho-orbit-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-hidden={hideLabel}
      aria-label={hideLabel ? undefined : "Soninho"}
      className={cn("shrink-0", className)}
    >
      {!hideLabel ? <title>Soninho</title> : null}
      <defs>
        <linearGradient id={gMoon} x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e9d5ff" />
          <stop offset="0.45" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id={gOrbit} x1="0" y1="24" x2="32" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" stopOpacity="0" />
          <stop offset="0.5" stopColor="#818cf8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#818cf8" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="32" height="32" rx="9" fill="#080e1a" />

      <path
        d="M5 23.5C10.5 27.5 21.5 27.5 27 23.5"
        fill="none"
        stroke={`url(#${gOrbit})`}
        strokeWidth="1.25"
        strokeLinecap="round"
      />

      <circle cx="14.25" cy="16" r="9.25" fill={`url(#${gMoon})`} />
      <circle cx="20.75" cy="15.25" r="8.1" fill="#080e1a" />

      <ellipse cx="11" cy="12" rx="2.2" ry="1.4" fill="white" fillOpacity="0.35" transform="rotate(-28 11 12)" />

      <path
        d="M24.5 7.5l0.55 1.35 1.45 0.1-1.1 0.95 0.35 1.4-1.25-0.75-1.25 0.75 0.35-1.4-1.1-0.95 1.45-0.1z"
        fill="#fde68a"
        fillOpacity="0.95"
      />
    </svg>
  );
}
