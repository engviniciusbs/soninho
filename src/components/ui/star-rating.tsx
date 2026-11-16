"use client"

import { useRef, type KeyboardEvent } from "react"

import { IconStar } from "@/components/brand/icons"
import { cn } from "@/lib/utils"

export interface StarRatingProps {
  /** 1 to 5, or `null` when not rated. */
  value: number | null
  onChange: (v: number | null) => void
  /** Accessible name of the group ("Qualidade do sono"). */
  label: string
  /** Id of a visible label; when given it names the group instead of `label`. */
  labelledBy?: string
  className?: string
}

const STARS = [1, 2, 3, 4, 5] as const

/**
 * Five lavender line stars as a radio group: one tab stop, arrows move the
 * rating, tapping the checked star again clears it. Native buttons turn
 * Enter and Space into a click, so only the arrows need a key handler.
 */
export function StarRating({ value, onChange, label, labelledBy, className }: StarRatingProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const focusStar = value ?? 1

  function move(event: KeyboardEvent<HTMLButtonElement>, star: number) {
    let next: number | null = null
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = Math.min(5, star + 1)
        break
      case "ArrowLeft":
      case "ArrowDown":
        next = Math.max(1, star - 1)
        break
      case "Home":
        next = 1
        break
      case "End":
        next = 5
        break
    }
    if (next === null) return
    event.preventDefault()
    refs.current[next - 1]?.focus()
    if (next !== value) onChange(next)
  }

  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      data-slot="star-rating"
      className={cn("flex items-center gap-0.5", className)}
    >
      {STARS.map((star) => {
        const checked = star === value
        const lit = value !== null && star <= value
        return (
          <button
            key={star}
            ref={(el) => {
              refs.current[star - 1] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`${star} de 5 estrelas`}
            tabIndex={star === focusStar ? 0 : -1}
            onClick={() => onChange(checked ? null : star)}
            onKeyDown={(e) => move(e, star)}
            className="grid size-11 cursor-pointer place-items-center rounded-full outline-none transition-transform duration-(--sn-dur-micro) ease-sn-out active:scale-90 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr"
          >
            <IconStar size={28} className={lit ? "fill-sn-pr text-sn-pr" : "text-sn-mu"} />
          </button>
        )
      })}
    </div>
  )
}
