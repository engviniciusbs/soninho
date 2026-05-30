import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps extends React.ComponentProps<"div"> {
  /** Visual emphasis. "default" = solid surface, "muted" = translucent. */
  tone?: "default" | "muted";
  /** Padding preset. */
  padding?: "default" | "compact" | "none";
}

/**
 * Unified surface for dashboard sections.
 * Consistent radius (rounded-2xl), hairline border and soft elevation.
 * Presentational only.
 */
export function SectionCard({
  className,
  tone = "default",
  padding = "default",
  ...props
}: SectionCardProps) {
  return (
    <div
      data-slot="section-card"
      className={cn(
        "rounded-2xl",
        tone === "default" ? "surface" : "surface-muted",
        padding === "default" && "p-5",
        padding === "compact" && "p-4",
        className
      )}
      {...props}
    />
  );
}

interface SectionCardHeaderProps
  extends Omit<React.ComponentProps<"div">, "title"> {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

/** Optional standardized header row for a SectionCard. */
export function SectionCardHeader({
  title,
  icon,
  action,
  className,
  children,
  ...props
}: SectionCardHeaderProps) {
  return (
    <div
      className={cn("flex items-center justify-between gap-2", className)}
      {...props}
    >
      {children ?? (
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon}
          {title}
        </h2>
      )}
      {action}
    </div>
  );
}
