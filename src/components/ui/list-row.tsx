import Link from "next/link"
import type { ReactNode } from "react"

import { IconChevronRight } from "@/components/brand/icons"
import { cn } from "@/lib/utils"

export interface ListRowProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  value?: ReactNode
  href?: string
  onClick?: () => void
  className?: string
}

/**
 * One row of a list (mockup `.menu .it` and `.list .item`): icon in a radius-12
 * square, title over a muted subtitle, and a value or a chevron on the right.
 * A `Link` with `href`, a `button` with `onClick`, otherwise a plain `div`.
 */
export function ListRow({ icon, title, subtitle, value, href, onClick, className }: ListRowProps) {
  const interactive = Boolean(href || onClick)
  const showChevron = Boolean(href) && value === undefined

  const content = (
    <>
      {icon && (
        <span
          aria-hidden="true"
          className="grid size-[38px] shrink-0 place-items-center rounded-xl bg-sn-s2 text-sn-pr [&_svg:not([class*='size-'])]:size-5"
        >
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-sans text-[15px] font-bold text-sn-tx">{title}</span>
        {subtitle && (
          <span className="truncate font-sans text-[13px] font-semibold text-sn-mu">{subtitle}</span>
        )}
      </span>
      {value !== undefined && (
        <span className="shrink-0 font-sans text-base font-extrabold text-sn-tx tabular-nums">{value}</span>
      )}
      {showChevron && (
        <span data-testid="list-row-chevron" className="shrink-0 text-sn-mu">
          <IconChevronRight size={20} />
        </span>
      )}
    </>
  )

  const classes = cn(
    "flex min-h-11 w-full items-center gap-3.5 px-1 py-3 text-left",
    interactive &&
      "cursor-pointer rounded-xl outline-none transition-transform duration-(--sn-dur-micro) ease-sn-out hover:bg-sn-s2/50 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr",
    className
  )

  if (href) {
    return (
      <Link href={href} data-slot="list-row" className={classes}>
        {content}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" data-slot="list-row" onClick={onClick} className={classes}>
        {content}
      </button>
    )
  }
  return (
    <div data-slot="list-row" className={classes}>
      {content}
    </div>
  )
}
