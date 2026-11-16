"use client";

import { useId } from "react";
import { Card } from "@/components/ui/card";
import { BigNumber } from "@/components/ui/big-number";
import { Skeleton } from "@/components/ui/skeleton";
import { MoonOrbit } from "@/components/brand/illustrations/MoonOrbit";
import { SunOrbit } from "@/components/brand/illustrations/SunOrbit";
import { IconSpark } from "@/components/brand/icons";
import { formatDuration } from "@/lib/utils";

export interface NextSleepCardProps {
  kind: "NAP" | "NIGHT_SLEEP";
  /** "HH:mm", "Agora" when overdue, or null while it is still unknown. */
  time: string | null;
  /** Minutes until `time`; null hides the "Em cerca de" line. */
  minutesUntil: number | null;
  overdue: boolean;
  /** Opens "Por que esse horário?"; omitted for the nanny. */
  onWhy?: () => void;
}

/** "Previsão de sono" hero (mockup `.hero`): kind, big time, moon or sun. */
export function NextSleepCard({ kind, time, minutesUntil, overdue, onWhy }: NextSleepCardProps) {
  const labelId = useId();
  const isNight = kind === "NIGHT_SLEEP";

  return (
    <Card
      role="region"
      aria-labelledby={labelId}
      className="relative min-h-[168px] gap-0 px-[18px]"
    >
      <span
        data-testid={isNight ? "art-moon" : "art-sun"}
        aria-hidden="true"
        className="pointer-events-none absolute top-5 right-1"
      >
        {isNight ? <MoonOrbit size={140} /> : <SunOrbit size={140} />}
      </span>

      <div className="relative">
        <p id={labelId} className="font-sans text-sm font-bold text-sn-mu">
          Previsão de sono
        </p>
        <p className="mt-1 font-display text-[22px] leading-tight font-bold">
          {isNight ? "Sono noturno" : "Soneca"}
        </p>
        {time === null ? (
          <Skeleton className="my-1.5 h-[60px] w-40 rounded-xl" />
        ) : (
          <BigNumber size="xl" className="my-1.5 tracking-[-0.02em]">
            {time}
          </BigNumber>
        )}
        {overdue ? (
          <p className="font-sans text-sm font-semibold text-sn-mu">Já passou do horário previsto</p>
        ) : (
          time !== null &&
          minutesUntil !== null && (
            <p className="font-sans text-sm font-semibold text-sn-mu">
              Em cerca de {formatDuration(Math.ceil(minutesUntil))}
            </p>
          )
        )}
        {onWhy && (
          <button
            type="button"
            onClick={onWhy}
            className="-mx-2 mt-1.5 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-2 font-sans text-[13px] font-bold text-sn-pr outline-none transition-transform duration-(--sn-dur-micro) ease-sn-out motion-reduce:transition-none hover:bg-sn-pr/10 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr"
          >
            <IconSpark size={14} />
            Por que esse horário?
          </button>
        )}
      </div>
    </Card>
  );
}
