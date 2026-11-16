"use client";

import { useId } from "react";
import { Chip } from "@/components/ui/chip";
import { IconClock } from "@/components/brand/icons";
import { OFFSETS } from "./useBackdate";

interface BackdateStartChipsProps {
  offset: number;
  useCustom: boolean;
  customTime: string;
  /** Resolved back-dated start ("HH:mm"), or null to start now. */
  startLabel: string | null;
  onSelectOffset: (minutes: number) => void;
  onSelectCustom: () => void;
  onCustomTimeChange: (time: string) => void;
}

/** "Começou antes?": offset chips plus the custom start-time input. */
export function BackdateStartChips({
  offset, useCustom, customTime, startLabel,
  onSelectOffset, onSelectCustom, onCustomTimeChange,
}: BackdateStartChipsProps) {
  const headingId = useId();
  return (
    <div role="group" aria-labelledby={headingId} className="flex flex-col items-center gap-3">
      <p id={headingId} className="font-sans text-sm font-bold text-sn-mu">
        Iniciou há quanto tempo?
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {OFFSETS.map(({ label, value }) => (
          <Chip
            key={value}
            selected={!useCustom && offset === value}
            onClick={() => onSelectOffset(value)}
          >
            {label}
          </Chip>
        ))}
        <Chip selected={useCustom} onClick={onSelectCustom}>
          <IconClock size={14} />
          Horário
        </Chip>
      </div>

      {useCustom && (
        <div className="flex items-center justify-center gap-2">
          <label htmlFor="backdate-time" className="font-sans text-sm font-semibold text-sn-mu">
            Às:
          </label>
          <input
            id="backdate-time"
            type="time"
            value={customTime}
            onChange={(e) => onCustomTimeChange(e.target.value)}
            className="h-11 rounded-full border border-sn-bd bg-sn-s2 px-4 font-sans text-base font-bold text-sn-tx tabular-nums outline-none [color-scheme:dark] active:border-sn-pr disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr"
          />
        </div>
      )}

      {startLabel && (
        <p className="font-sans text-sm font-semibold text-sn-tx tabular-nums">
          Começou às {startLabel}
        </p>
      )}
    </div>
  );
}
