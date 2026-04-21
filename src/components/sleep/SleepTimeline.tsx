"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getSleepSessions } from "@/lib/supabase/queries";
import { useBaby } from "@/components/providers/BabyProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfDay, endOfDay, addDays, subDays, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDuration, formatTimeRange } from "@/lib/utils";
import type { SleepSession } from "@/types";


const DAY_MS = 24 * 60 * 60 * 1000;

export function SleepTimeline() {
  const { activeBaby } = useBaby();
  const supabase = createClient();
  const [currentDate, setCurrentDate] = useState(new Date());

  const dayStart = startOfDay(currentDate);
  const dayEnd = endOfDay(currentDate);

  // Fetch from previous day's start so night sleep that began before midnight
  // (e.g. 22:00 last night, ending 06:00 today) is included.
  const extendedFrom = subDays(dayStart, 1);

  const { data: allSessions = [], isLoading } = useQuery({
    queryKey: [
      "sleep-sessions",
      activeBaby?.id,
      "timeline",
      format(currentDate, "yyyy-MM-dd"),
    ],
    queryFn: async (): Promise<SleepSession[]> => {
      if (!activeBaby) return [];
      const { data, error } = await getSleepSessions(
        supabase,
        activeBaby.id,
        extendedFrom,
        dayEnd
      );
      if (error) throw error;
      return (data ?? []) as SleepSession[];
    },
    enabled: !!activeBaby,
  });

  const blocks = useMemo(() => {
    return allSessions
      .filter((s) => {
        if (!s.end_time) return false;
        const start = new Date(s.start_time);
        const end = new Date(s.end_time);
        // Keep only sessions that overlap with the current day
        return start < dayEnd && end > dayStart;
      })
      .map((s) => {
        const start = new Date(s.start_time);
        const end = new Date(s.end_time!);

        // Clamp both boundaries to [dayStart, dayEnd] and compute as ms offsets.
        // This handles sessions that cross midnight correctly without using getHours().
        const clampedStartMs =
          Math.max(start.getTime(), dayStart.getTime()) - dayStart.getTime();
        const clampedEndMs =
          Math.min(end.getTime(), dayEnd.getTime() + 1) - dayStart.getTime();

        const left = (clampedStartMs / DAY_MS) * 100;
        const width = ((clampedEndMs - clampedStartMs) / DAY_MS) * 100;

        return {
          session: s,
          left: Math.max(0, left),
          width: Math.max(0.5, Math.min(width, 100 - left)),
          crossesMidnight:
            new Date(s.start_time) < dayStart || new Date(s.end_time!) > dayEnd,
        };
      });
  }, [allSessions, dayStart, dayEnd]);

  if (isLoading) {
    return <Skeleton className="h-40 rounded-2xl" />;
  }

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">
          Linha do tempo
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setCurrentDate((d) => subDays(d, 1))}
            aria-label="Dia anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[100px] text-center">
            {isToday(currentDate)
              ? "Hoje"
              : format(currentDate, "d 'de' MMM", { locale: ptBR })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setCurrentDate((d) => addDays(d, 1))}
            disabled={isToday(currentDate)}
            aria-label="Próximo dia"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Hour labels */}
        <div className="relative mb-1">
          <div className="flex justify-between">
            {[0, 4, 8, 12, 16, 20, 24].map((h) => (
              <span
                key={h}
                className="text-[10px] text-muted-foreground"
                style={{
                  position: "absolute",
                  left: `${(h / 24) * 100}%`,
                  transform: "translateX(-50%)",
                }}
              >
                {h}h
              </span>
            ))}
          </div>
        </div>

        {/* Timeline bar */}
        <div className="relative h-12 mt-5 rounded-xl bg-secondary/50 overflow-hidden">
          {blocks.map(({ session, left, width, crossesMidnight }) => (
            <Popover key={session.id}>
              <PopoverTrigger
                  className={`absolute top-1 bottom-1 rounded-lg cursor-pointer transition-opacity hover:opacity-80 ${
                    session.type === "NIGHT_SLEEP"
                      ? "bg-sky-sleep/60"
                      : "bg-lavender/60"
                  }`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    minWidth: 4,
                  }}
                  aria-label={`${session.type === "NAP" ? "Soneca" : "Sono noturno"}: ${formatTimeRange(session.start_time, session.end_time)}`}
              />
              <PopoverContent className="w-56 rounded-xl p-3 text-sm space-y-1">
                <p className="font-semibold">
                  {session.type === "NAP" ? "Soneca" : "Sono noturno"}
                </p>
                <p className="text-muted-foreground">
                  {formatTimeRange(session.start_time, session.end_time)}
                </p>
                {crossesMidnight && (
                  <p className="text-[11px] text-amber-400">
                    ↗ Cruzou a meia-noite
                  </p>
                )}
                {session.duration_min != null && (
                  <p className="font-medium">
                    {formatDuration(session.duration_min)}
                  </p>
                )}
                {session.notes && (
                  <p className="text-xs text-muted-foreground">
                    {session.notes}
                  </p>
                )}
              </PopoverContent>
            </Popover>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-3 w-3 rounded-sm bg-sky-sleep/60" />
            Noturno
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-3 w-3 rounded-sm bg-lavender/60" />
            Soneca
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
