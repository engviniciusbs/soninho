"use client";

import { useId, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChevronRight } from "@/components/brand/icons";
import { useBaby } from "@/components/providers/BabyProvider";
import { useActiveSleepTimer } from "@/store/sleepStore";
import { useFeedingTimeline } from "@/hooks/useFeedingTimeline";
import { useNow } from "@/hooks/useNow";
import { createClient } from "@/lib/supabase/client";
import { getRecentSessions } from "@/lib/supabase/queries/sleep";
import { estimateWakeTime } from "@/lib/sleep/wakeEstimate";
import { describeFeeding } from "@/lib/feeding/describeFeeding";
import type { FeedingTimelineItem, SleepSession } from "@/types";
import { formatDuration } from "@/lib/utils";

/** Enough days for the last sleep and the last 7 nights of the wake estimate. */
const RECENT_DAYS = 8;

function hhmm(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

function feedingRow(item: FeedingTimelineItem): { subtitle: string; value?: string } {
  const { label, value } = describeFeeding(item);
  return { subtitle: `${label}, ${hhmm(item.startTime)}`, value };
}

/** "Hoje" (mockup `.list`): last sleep or the wake estimate, and the last feeding. */
export function TodayCard({ nanny }: { nanny: boolean }) {
  const titleId = useId();
  const { activeBaby } = useBaby();
  const babyId = activeBaby?.id;
  const timer = useActiveSleepTimer(babyId);
  const now = useNow(60_000);
  const supabase = createClient();

  // "sleep-sessions" prefix: refreshed with every other sleep list after a stop.
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sleep-sessions", "home-recent", babyId],
    queryFn: async (): Promise<SleepSession[]> => {
      if (!babyId) return [];
      const { data } = await getRecentSessions(supabase, babyId, RECENT_DAYS);
      return (data ?? []) as SleepSession[];
    },
    enabled: !!babyId,
    staleTime: 60_000,
  });
  const { data: feedings, isLoading: feedingsLoading } = useFeedingTimeline();

  const lastSleep = useMemo(
    () =>
      (sessions ?? [])
        .filter((s) => s.end_time)
        .sort((a, b) => Date.parse(b.end_time!) - Date.parse(a.end_time!))[0] ?? null,
    [sessions]
  );

  const sleepingAtNight = timer?.sleepType === "NIGHT_SLEEP";
  const wakeEstimate = useMemo(() => {
    if (!sleepingAtNight || now === null || !sessions) return null;
    const nights = sessions
      .filter((s) => s.type === "NIGHT_SLEEP")
      .map((s) => ({ start: s.start_time, end: s.end_time }));
    return estimateWakeTime(nights, new Date(now), Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [sleepingAtNight, now, sessions]);

  const lastFeeding = useMemo(
    () =>
      [...(feedings ?? [])].sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime))[0] ??
      null,
    [feedings]
  );

  return (
    <Card role="region" aria-labelledby={titleId} className="gap-0 px-[18px]">
      <div className="mb-1 flex items-center justify-between border-b border-sn-bd pb-3">
        <h2 id={titleId} className="font-sans text-lg font-bold text-sn-tx">
          Hoje
        </h2>
        {!nanny && (
          <Link
            href="/history"
            className="-my-2 -mr-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 font-sans text-sm font-bold text-sn-pr outline-none transition-transform duration-(--sn-dur-micro) ease-sn-out motion-reduce:transition-none hover:bg-sn-pr/10 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr"
          >
            Ver registro
            <IconChevronRight size={16} />
          </Link>
        )}
      </div>

      {timer ? (
        wakeEstimate && (
          <ListRow
            title="Estimativa de despertar"
            subtitle="Média das últimas noites"
            value={`~${format(wakeEstimate, "HH:mm")}`}
          />
        )
      ) : isLoading ? (
        <RowSkeleton />
      ) : lastSleep ? (
        <ListRow
          title="Último sono"
          subtitle={`${lastSleep.type === "NAP" ? "Soneca" : "Sono noturno"}, ${hhmm(lastSleep.start_time)} a ${hhmm(lastSleep.end_time!)}`}
          value={formatDuration(
            (Date.parse(lastSleep.end_time!) - Date.parse(lastSleep.start_time)) / 60_000
          )}
        />
      ) : (
        <ListRow title="Último sono" subtitle="Nenhum sono registrado ainda" />
      )}

      {feedingsLoading ? (
        <RowSkeleton />
      ) : lastFeeding ? (
        <ListRow title="Última mamada" {...feedingRow(lastFeeding)} />
      ) : (
        <ListRow title="Última mamada" subtitle="Nenhuma mamada nos últimos dias" />
      )}
    </Card>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3" aria-hidden="true">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-3.5 w-36 rounded-md" />
      </div>
      <Skeleton className="h-5 w-14 rounded-md" />
    </div>
  );
}
