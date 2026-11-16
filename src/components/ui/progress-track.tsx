import { cn } from "@/lib/utils"
import type { StatusTone } from "./status-pill"

const FILL: Record<StatusTone, string> = {
  ok: "bg-sn-ok",
  attention: "bg-sn-pr",
  alert: "bg-sn-warn",
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0)

export interface ProgressTrackProps {
  /** 0 to 1, clamped. */
  value: number
  /** 0 to 1, clamped: a thin mark on the track (e.g. the ideal moment). */
  marker?: number
  tone?: StatusTone
  label: string
  className?: string
}

/** Track with a fill and an optional marker (mockup `.bar`). The fill scales on X, never by width. */
export function ProgressTrack({ value, marker, tone = "ok", label, className }: ProgressTrackProps) {
  const v = clamp01(value)
  const m = marker === undefined ? undefined : clamp01(marker)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      data-slot="progress-track"
      data-tone={tone}
      className={cn("relative h-2 w-full rounded-full bg-sn-s2", className)}
    >
      <div className="absolute inset-0 overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full w-full origin-left rounded-full transition-transform duration-(--sn-dur-short) ease-sn-out",
            FILL[tone]
          )}
          style={{ transform: `scaleX(${v})` }}
        />
      </div>
      {m !== undefined && (
        <span
          aria-hidden="true"
          data-slot="progress-track-marker"
          className="absolute -top-[5px] -bottom-[5px] w-0.5 -translate-x-1/2 rounded-[2px] bg-sn-tx opacity-80"
          style={{ left: `${m * 100}%` }}
        />
      )}
    </div>
  )
}
