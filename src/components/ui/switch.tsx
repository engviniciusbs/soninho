"use client"

import { cn } from "@/lib/utils"

export interface SwitchProps {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  disabled?: boolean
  "aria-label"?: string
  className?: string
}

/**
 * On/off switch (`role="switch"`). The track is 28px tall; an invisible
 * extension takes the touch target past 44px. Only the knob moves.
 */
export function Switch({ checked, onCheckedChange, disabled, "aria-label": ariaLabel, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      data-slot="switch"
      className={cn(
        "relative h-7 w-12 shrink-0 cursor-pointer rounded-full outline-none after:absolute after:-inset-2",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr",
        "disabled:cursor-not-allowed disabled:opacity-55",
        checked ? "bg-sn-pr" : "bg-sn-s2",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1 left-1 size-5 rounded-full transition-transform duration-(--sn-dur-micro) ease-sn-out",
          checked ? "translate-x-5 bg-sn-pr-ink" : "translate-x-0 bg-sn-tx"
        )}
      />
    </button>
  )
}
