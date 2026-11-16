import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface ChipProps {
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  children: ReactNode
  className?: string
}

const BASE =
  "inline-flex items-center gap-1.5 rounded-full border px-[13px] py-2 font-sans text-[13px] font-bold whitespace-nowrap"

const LOOK = (selected: boolean) =>
  selected ? "border-sn-pr bg-sn-pr text-sn-pr-ink" : "border-sn-bd bg-sn-s2 text-sn-tx"

/** Small pill (mockup `.chip`, `.chip.on`). A toggle button with `aria-pressed` when clickable. */
export function Chip({ selected = false, onClick, disabled, children, className }: ChipProps) {
  if (!onClick) {
    return (
      <span data-slot="chip" data-selected={selected || undefined} className={cn(BASE, LOOK(selected), className)}>
        {children}
      </span>
    )
  }
  return (
    <button
      type="button"
      data-slot="chip"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        BASE,
        LOOK(selected),
        // 44px touch target around the 36px pill; a short label ("1", "OK") still gets 44px of width.
        "relative min-h-9 min-w-11 justify-center cursor-pointer outline-none select-none after:absolute after:-inset-y-1 after:inset-x-0",
        "transition-transform duration-(--sn-dur-micro) ease-sn-out active:scale-[0.97]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr",
        selected ? "hover:bg-sn-pr/88" : "hover:border-sn-pr/60",
        "disabled:pointer-events-none disabled:opacity-55",
        className
      )}
    >
      {children}
    </button>
  )
}
