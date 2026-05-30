import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Small uppercase label above the title (optional) */
  eyebrow?: React.ReactNode;
  /** Main page title — rendered in the display font */
  title: React.ReactNode;
  /** Supporting description under the title (optional) */
  subtitle?: React.ReactNode;
  /** Right-aligned actions (buttons, selects, etc.) */
  actions?: React.ReactNode;
  /** Optional leading visual (avatar, icon badge) */
  leading?: React.ReactNode;
  className?: string;
}

/**
 * Consistent page header used across the dashboard.
 * Presentational only — no state or side effects.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  leading,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {leading}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-2xl sm:text-3xl font-semibold leading-tight text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
