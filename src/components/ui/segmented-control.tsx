"use client"

import { useRef, type KeyboardEvent, type ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

/** The group is named by a string or by the id of a visible label. */
type GroupName = { "aria-label": string; "aria-labelledby"?: never } | { "aria-labelledby": string; "aria-label"?: never }

export type SegmentedControlProps<T extends string> = GroupName & {
  value: T
  onChange: (v: T) => void
  options: SegmentedOption<T>[]
  size?: "md" | "sm"
  className?: string
}

/**
 * Pill track with the active option in lavender (mockup `.seg`, `.seg.sm`).
 * A radio group: one tab stop on the checked option, arrows move the selection.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const activeIndex = options.findIndex((o) => o.value === value)
  const focusIndex = activeIndex === -1 ? 0 : activeIndex

  function select(index: number) {
    const option = options[index]
    if (!option) return
    refs.current[index]?.focus()
    if (option.value !== value) onChange(option.value)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = options.length - 1
    let next: number | null = null
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = index === last ? 0 : index + 1
        break
      case "ArrowLeft":
      case "ArrowUp":
        next = index === 0 ? last : index - 1
        break
      case "Home":
        next = 0
        break
      case "End":
        next = last
        break
    }
    if (next === null) return
    event.preventDefault()
    select(next)
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      data-slot="segmented-control"
      data-size={size}
      className={cn(
        "flex w-full rounded-full border border-sn-bd bg-sn-s1 p-[5px]",
        className
      )}
    >
      {options.map((option, index) => {
        const checked = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === focusIndex ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-2 font-sans font-bold whitespace-nowrap text-sn-tx outline-none select-none",
              "transition-transform duration-(--sn-dur-micro) ease-sn-out active:scale-[0.98]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr",
              "hover:bg-sn-s2 aria-checked:bg-sn-pr aria-checked:text-sn-pr-ink aria-checked:hover:bg-sn-pr",
              "disabled:pointer-events-none disabled:opacity-55",
              "[&_svg]:pointer-events-none [&_svg]:shrink-0",
              size === "md" ? "py-3 text-base [&_svg:not([class*='size-'])]:size-5" : "py-2.5 text-sm [&_svg:not([class*='size-'])]:size-4"
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
