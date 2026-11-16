import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface RingProps {
  /** 0 to 1, clamped. */
  progress: number
  /** Diameter in CSS pixels. */
  size?: number
  children?: ReactNode
  className?: string
}

/** Timer ring (mockup `.ring`): conic lavender over `sn-s2`, page colour inside. Decorative; the children carry the value. */
export function Ring({ progress, size = 220, children, className }: RingProps) {
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0
  const pct = `${(p * 100).toFixed(2)}%`
  return (
    <div
      data-slot="ring"
      className={cn("relative mx-auto grid place-items-center rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--sn-pr) 0 ${pct}, var(--sn-s2) ${pct} 100%)`,
      }}
    >
      <div aria-hidden="true" className="absolute inset-[11px] rounded-full bg-sn-bg" />
      <div className="relative z-10 text-center">{children}</div>
    </div>
  )
}
