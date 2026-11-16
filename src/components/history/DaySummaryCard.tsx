"use client";

import { useId } from "react";
import { Card } from "@/components/ui/card";
import { BigNumber } from "@/components/ui/big-number";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { SleepTimeline } from "@/components/sleep/SleepTimeline";
import { formatDuration } from "@/lib/utils";
import { DAY_STATUS_LABEL, dayStatus, type DayStatus } from "@/lib/sleep/dayStatus";
import type { SleepSession } from "@/types";

const TONE: Record<DayStatus, StatusTone> = {
  within: "ok",
  below: "attention",
  above: "attention",
};

export interface DaySummaryCardProps {
  /** Minutes slept inside the day (sleeps cut at midnight). */
  totalMinutes: number;
  /** Expected hours of sleep a day for the baby's age. */
  targetHours: number;
  sessions: SleepSession[];
  dayStart: Date;
  dayEnd: Date;
  now: number | null;
  /** Today is not over: the total is "so far" and only "Acima do esperado" is final. */
  isToday?: boolean;
}

/**
 * "Sono no dia" ("Sono até agora" on today; mockup Registro card): the total, how it compares with the
 * age (none when nothing was slept) and the day's blocks band. A day with no
 * sleep shows what goes here instead of a zeroed total.
 */
export function DaySummaryCard({
  totalMinutes,
  targetHours,
  sessions,
  dayStart,
  dayEnd,
  now,
  isToday = false,
}: DaySummaryCardProps) {
  const titleId = useId();
  const computed = dayStatus(totalMinutes, targetHours);
  // On today, "below" or "within" can still change; "above" cannot.
  const status = isToday && computed !== "above" ? null : computed;
  const title = isToday ? "Sono até agora" : "Sono no dia";

  return (
    <Card role="region" aria-labelledby={titleId} className="gap-0 px-[18px]">
      {sessions.length === 0 ? (
        <>
          <h2 id={titleId} className="font-sans text-sm font-bold text-sn-mu">
            {title}
          </h2>
          <p className="mt-1 font-sans text-lg font-bold text-sn-tx">Nenhum sono registrado neste dia</p>
          <p className="mt-1 font-sans text-[15px] font-semibold text-sn-mu">
            O total e a faixa do dia aparecem aqui. Esqueceu de registrar? Adicione o sono abaixo.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2.5">
            <div>
              <h2 id={titleId} className="font-sans text-sm font-bold text-sn-mu">
                {title}
              </h2>
              <BigNumber className="mt-0.5">{formatDuration(totalMinutes)}</BigNumber>
            </div>
            {status && <StatusPill tone={TONE[status]}>{DAY_STATUS_LABEL[status]}</StatusPill>}
          </div>
          <SleepTimeline sessions={sessions} dayStart={dayStart} dayEnd={dayEnd} now={now} />
        </>
      )}
    </Card>
  );
}
