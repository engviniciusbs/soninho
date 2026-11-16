"use client";

import { useId } from "react";
import { useBreastfeedingTimer } from "@/hooks/useBreastfeedingTimer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconStop } from "@/components/brand/icons";
import { cn } from "@/lib/utils";
import type { BreastSide } from "@/types";

function formatMinSec(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const SIDES: { side: BreastSide; label: string }[] = [
  { side: "LEFT", label: "Esquerdo" },
  { side: "RIGHT", label: "Direito" },
];

/**
 * Breastfeeding (mockup "Comida, aba Peito"): the two sides are big buttons
 * with their time. Stopped, a side starts the feeding on it; running, the
 * other side switches with one tap, and "Terminar mamada" ends it.
 */
export function BreastfeedingTimer() {
  const labelId = useId();
  const {
    isRunning,
    activeSide,
    liveLeftSec,
    liveRightSec,
    handleStart,
    handleSwitchSide,
    handleStop,
  } = useBreastfeedingTimer();

  return (
    <Card role="region" aria-labelledby={labelId} className="gap-0 px-[18px] text-center">
      <p id={labelId} className="font-sans text-sm font-bold text-sn-mu">
        {isRunning ? "Mamando agora" : "Peito"}
      </p>

      <div className="my-3 grid grid-cols-2 gap-2.5">
        {SIDES.map(({ side, label }) => {
          const active = isRunning && activeSide === side;
          const sec = side === "LEFT" ? liveLeftSec : liveRightSec;
          return (
            <button
              key={side}
              type="button"
              aria-pressed={active}
              onClick={() => (isRunning ? handleSwitchSide(side) : handleStart(side))}
              className={cn(
                "flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-[1.5px] p-4 outline-none select-none",
                "transition-transform duration-(--sn-dur-micro) ease-sn-out motion-reduce:transition-none active:scale-[0.98]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr",
                "disabled:pointer-events-none disabled:opacity-55",
                active
                  ? "border-sn-pr bg-sn-pr/8"
                  : "border-sn-bd hover:border-sn-pr/60 hover:bg-sn-s2/50"
              )}
            >
              <span className="font-sans text-sm font-bold text-sn-mu">{label}</span>
              <span className="mt-1 font-display text-[28px] leading-tight font-bold text-sn-tx tabular-nums">
                {formatMinSec(sec)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mb-3.5 font-sans text-[13px] font-semibold text-sn-mu">
        {isRunning ? "Toque no lado para trocar" : "Toque no lado para começar"}
      </p>

      {isRunning && (
        <Button variant="secondary" className="w-full" onClick={() => void handleStop()}>
          <IconStop size={20} />
          Terminar mamada
        </Button>
      )}
    </Card>
  );
}
