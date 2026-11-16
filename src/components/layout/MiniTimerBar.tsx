"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveSleepTimer } from "@/store/sleepStore";
import { useBaby } from "@/components/providers/BabyProvider";
import { formatElapsedSeconds, cn } from "@/lib/utils";
import { useSessionClock } from "@/hooks/timer/useSessionClock";
import { Card } from "@/components/ui/card";
import { BigNumber } from "@/components/ui/big-number";
import { buttonVariants } from "@/components/ui/button";
import { IconChevronRight, IconMoon, IconSun } from "@/components/brand/icons";

/**
 * Sono em andamento visto de fora da home (spec §8.2). "Ver no Início" leva
 * ao timer da home, onde o fim do sono e a revisão pós-sono acontecem.
 */
export function MiniTimerBar() {
  const pathname = usePathname();
  const { activeBaby } = useBaby();
  // Shows the running sleep of the baby currently selected.
  const timer = useActiveSleepTimer(activeBaby?.id);
  const startTime = timer?.startTime ?? null;
  // Same shared clock as the sleep timer and the wake-window badge.
  const { elapsedSec } = useSessionClock(startTime);

  // A home já mostra o timer completo.
  if (timer === null || pathname === "/app") return null;

  const elapsed = elapsedSec === null ? "00:00:00" : formatElapsedSeconds(elapsedSec);
  const isNap = timer.sleepType === "NAP";
  const label = isNap ? "Soneca" : "Sono noturno";
  const TypeIcon = isNap ? IconSun : IconMoon;

  return (
    <Card size="sm" className="flex-row items-center gap-3 bg-sn-s1 px-3.5">
      <span
        aria-hidden="true"
        className={cn(
          "grid size-[38px] shrink-0 place-items-center rounded-xl bg-sn-s2",
          isNap ? "text-sn-sun" : "text-sn-pr"
        )}
      >
        <TypeIcon size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        {/* O status anuncia só o estado, nunca o relógio que muda a cada segundo. */}
        <span role="status" className="truncate font-sans text-[13px] font-semibold text-sn-mu">
          {label}
          <span className="sr-only"> em andamento</span>
        </span>
        <BigNumber size="md">{elapsed}</BigNumber>
      </span>
      <Link href="/app" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "shrink-0")}>
        Ver no Início
        <IconChevronRight size={18} />
      </Link>
    </Card>
  );
}
