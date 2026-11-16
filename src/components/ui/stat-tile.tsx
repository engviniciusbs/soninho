import * as React from "react";
import { BigNumber } from "@/components/ui/big-number";
import { cn } from "@/lib/utils";

interface StatTileProps {
  icon?: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}

/**
 * Compact metric tile (mockup `.fig`): label, the figure in Fraunces and a
 * worded qualifier. Presentational only.
 */
export function StatTile({ icon, label, value, sub, className }: StatTileProps) {
  return (
    <div
      data-slot="stat-tile"
      className={cn("flex flex-col gap-1 rounded-[18px] border border-sn-bd bg-sn-card p-3.5", className)}
    >
      <div className="flex items-center gap-1.5 text-sn-mu">
        {icon && (
          <span aria-hidden="true" className="text-sn-pr [&_svg]:size-4">
            {icon}
          </span>
        )}
        <span className="font-sans text-sm font-bold">{label}</span>
      </div>
      <BigNumber size="md">{value}</BigNumber>
      {sub && <p className="font-sans text-[13px] font-semibold text-sn-mu">{sub}</p>}
    </div>
  );
}
