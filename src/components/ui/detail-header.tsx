import Link from "next/link"

import { IconChevronLeft } from "@/components/brand/icons"
import { cn } from "@/lib/utils"

export interface DetailHeaderProps {
  title: string
  backHref: string
  className?: string
}

/** Header of a detail page: a back button and the h1. */
export function DetailHeader({ title, backHref, className }: DetailHeaderProps) {
  return (
    <div data-slot="detail-header" className={cn("mt-0.5 mb-3.5 flex items-center gap-2", className)}>
      <Link
        href={backHref}
        aria-label="Voltar"
        className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-sn-tx outline-none transition-transform duration-(--sn-dur-micro) ease-sn-out hover:bg-sn-s2 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr"
      >
        <IconChevronLeft size={24} />
      </Link>
      <h1 className="min-w-0 truncate font-display text-2xl leading-tight font-bold text-sn-tx">{title}</h1>
    </div>
  )
}
