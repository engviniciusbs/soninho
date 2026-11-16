"use client";

import { Card } from "@/components/ui/card";
import { BigNumber } from "@/components/ui/big-number";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { ProgressTrack } from "@/components/ui/progress-track";
import { Skeleton } from "@/components/ui/skeleton";
import type { WakeWindowStatus } from "@/lib/sleep/wakeWindows";
import type { WakeWindowRange } from "@/types";
import { formatWindowBound } from "./format";
import { formatDuration } from "@/lib/utils";
import { g } from "@/lib/i18n/gender";
import type { BabySex } from "@/types";

const STATUS: Record<WakeWindowStatus, { tone: StatusTone; label: string }> = {
  green: { tone: "ok", label: "Na janela ideal" },
  yellow: { tone: "attention", label: "Quase na hora" },
  red: { tone: "alert", label: "Passou da janela" },
};

export interface WakeWindowCardProps {
  elapsedMinutes: number;
  status: WakeWindowStatus;
  range: WakeWindowRange;
  /** False when the baby has no finished sleep yet (nothing to count from). */
  hasLastSleep: boolean;
  isLoading: boolean;
  /** `babies.sex`: the title agrees with it ("Tempo acordada"); neutral when null. */
  sex?: BabySex | null;
}

/** "Tempo acordada" (mockup second card): value, status pill, track with the window start. */
export function WakeWindowCard({ elapsedMinutes, status, range, hasLastSleep, isLoading, sex }: WakeWindowCardProps) {
  // Neutral: "acordado" agrees with "tempo", so it reads right for any baby.
  const title = g(sex, { f: "Tempo acordada", m: "Tempo acordado", n: "Tempo acordado" });
  const windowText = `Janela de vigília: ${formatWindowBound(range.minMinutes)} a ${formatWindowBound(range.maxMinutes)}`;

  if (isLoading) {
    return (
      <Card className="px-[18px]" aria-busy="true">
        <p className="font-sans text-sm font-bold text-sn-mu">{title}</p>
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-2 w-full rounded-full" />
      </Card>
    );
  }

  if (!hasLastSleep) {
    return (
      <Card className="gap-1 px-[18px]">
        <p className="font-sans text-sm font-bold text-sn-mu">{title}</p>
        <p className="font-sans text-base font-semibold text-sn-tx">
          Registre o primeiro sono para acompanhar a janela.
        </p>
        <p className="font-sans text-[13px] font-semibold text-sn-mu">{windowText}</p>
      </Card>
    );
  }

  const s = STATUS[status];
  return (
    <Card className="gap-0 px-[18px]">
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <p className="font-sans text-sm font-bold text-sn-mu">{title}</p>
          <BigNumber size="lg" className="mt-1">
            {formatDuration(Math.floor(elapsedMinutes))}
          </BigNumber>
        </div>
        <StatusPill tone={s.tone}>{s.label}</StatusPill>
      </div>
      <ProgressTrack
        className="mt-4 mb-2.5"
        value={elapsedMinutes / range.maxMinutes}
        marker={range.minMinutes / range.maxMinutes}
        tone={s.tone}
        label={`${title} dentro da janela de vigília`}
      />
      <p className="font-sans text-[13px] font-semibold text-sn-mu">{windowText}</p>
    </Card>
  );
}
