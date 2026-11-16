import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface PageTitleProps {
  children: ReactNode
  action?: ReactNode
  className?: string
}

/** Page heading: the h1 in Fraunces at 28px (mockup `.ptitle`), with an optional action on the right. */
export function PageTitle({ children, action, className }: PageTitleProps) {
  return (
    <div data-slot="page-title" className={cn("mt-0.5 mb-3.5 flex items-center justify-between gap-3", className)}>
      <h1 className="font-display text-[28px] leading-tight font-bold text-sn-tx">{children}</h1>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
