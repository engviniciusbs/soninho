import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const SIZES = {
  xl: "text-[60px] leading-none",
  lg: "text-[32px] leading-[1.1]",
  md: "text-[22px] leading-tight",
} as const

export interface BigNumberProps {
  children: ReactNode
  size?: keyof typeof SIZES
  className?: string
}

/** A highlight figure (time, duration, amount) in Fraunces with tabular numerals. */
export function BigNumber({ children, size = "lg", className }: BigNumberProps) {
  return (
    <span
      data-slot="big-number"
      className={cn("block font-display font-bold text-sn-tx tabular-nums", SIZES[size], className)}
    >
      {children}
    </span>
  )
}
