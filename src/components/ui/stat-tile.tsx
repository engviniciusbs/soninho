import * as React from "react";
import { cn } from "@/lib/utils";

interface StatTileProps {
  icon?: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}

/**
 * Compact metric tile. Value uses the display font for an editorial feel.
 * Presentational only.
 */
export function StatTile({ icon, label, value, sub, className }: StatTileProps) {
  return (
    <div className={cn("rounded-2xl surface p-4", className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon && <span className="text-muted-foreground/80">{icon}</span>}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="num-display mt-1.5 text-2xl font-semibold text-foreground tabular-nums">
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
