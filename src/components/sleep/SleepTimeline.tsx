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

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TIMELINE_START = 0;
const TIMELINE_END = 24;

export function SleepTimeline() {
  const { activeBaby } = useBaby();
  const supabase = createClient();
  const [currentDate, setCurrentDate] = useState(new Date());

  const dayStart = startOfDay(currentDate);
  const dayEnd = endOfDay(currentDate);

  const { data: sessions = [], isLoading } = useQuery({
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
        dayStart,
        dayEnd
      );
      if (error) throw error;
      return (data ?? []) as SleepSession[];
    },
    enabled: !!activeBaby,
  });

  const blocks = useMemo(() => {
    return sessions
      .filter((s) => s.end_time)
      .map((s) => {
        const start = new Date(s.start_time);
        const end = new Date(s.end_time!);

        const startHour =
          start.getHours() + start.getMinutes() / 60;
        const endHour = end.getHours() + end.getMinutes() / 60;

        const left =
          ((Math.max(startHour, TIMELINE_START) - TIMELINE_START) /
            (TIMELINE_END - TIMELINE_START)) *
          100;
        const width =
          ((Math.min(endHour, TIMELINE_END) -
            Math.max(startHour, TIMELINE_START)) /
            (TIMELINE_END - TIMELINE_START)) *
          100;

        return {
          session: s,
          left: Math.max(0, left),
          width: Math.max(1, Math.min(width, 100 - left)),
        };
      });
  }, [sessions]);

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
          {blocks.map(({ session, left, width }) => (
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
              <PopoverContent className="w-52 rounded-xl p-3 text-sm space-y-1">
                <p className="font-semibold">
                  {session.type === "NAP" ? "Soneca" : "Sono noturno"}
                </p>
                <p className="text-muted-foreground">
                  {formatTimeRange(session.start_time, session.end_time)}
                </p>
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
