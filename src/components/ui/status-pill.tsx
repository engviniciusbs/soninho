import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type StatusTone = "ok" | "attention" | "alert"

const TONES: Record<StatusTone, string> = {
  // Mint only for "all good".
  ok: "border-sn-ok/50 bg-sn-ok/8 text-sn-ok",
  // Lavender for "worth a look", neither good nor bad.
  attention: "border-sn-pr/50 bg-sn-pr/8 text-sn-pr",
  // Amber only for alerts.
  alert: "border-sn-warn/50 bg-sn-warn/8 text-sn-warn",
}

export interface StatusPillProps {
  tone: StatusTone
  children: ReactNode
  className?: string
}

/** Status label in a pill (mockup `.pill`). Text, never colour alone, carries the meaning. */
export function StatusPill({ tone, children, className }: StatusPillProps) {
  return (
    <span
      data-slot="status-pill"
      data-tone={tone}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-sans text-xs font-extrabold whitespace-nowrap",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
