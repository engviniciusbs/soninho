"use client";

import { cn } from "@/lib/utils";

/** Row of "N dias" toggle pills (aria-pressed), shared by the report cards. */
export function PeriodPicker<T extends number>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (days: T) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-sn-mu">{label}</p>
      <div className="flex gap-2">
        {options.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => onChange(days)}
            aria-pressed={value === days}
            className={cn(
              "flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full px-3 font-sans text-base font-bold whitespace-nowrap tabular-nums outline-none",
              "transition-transform duration-(--sn-dur-micro) ease-sn-out active:scale-[0.98]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr",
              value === days ? "bg-sn-pr text-sn-pr-ink" : "bg-sn-s2 text-sn-tx hover:bg-sn-s2/70"
            )}
          >
            {days} dias
          </button>
        ))}
      </div>
    </div>
  );
}
