"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getSleepSessions } from "@/lib/supabase/queries";
import { useBaby } from "@/components/providers/BabyProvider";
import { SleepCard } from "@/components/sleep/SleepCard";
import { SleepForm } from "@/components/sleep/SleepForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Clock, Moon, Sun } from "lucide-react";
import { format, startOfDay, subDays, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDuration } from "@/lib/utils";
import type { SleepSession } from "@/types";

export default function HistoryPage() {
  const { activeBaby } = useBaby();
  const supabase = createClient();
  const [showForm, setShowForm] = useState(false);
  const [editSession, setEditSession] = useState<SleepSession | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [daysBack, setDaysBack] = useState(7);

  const from = subDays(startOfDay(new Date()), daysBack);
  const to = new Date();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sleep-sessions", activeBaby?.id, daysBack],
    queryFn: async (): Promise<SleepSession[]> => {
      if (!activeBaby) return [];
      const { data, error } = await getSleepSessions(
        supabase,
        activeBaby.id,
        from,
        to
      );
      if (error) throw error;
      return (data ?? []) as SleepSession[];
    },
    enabled: !!activeBaby,
  });

  const filtered = useMemo(() => {
    if (filterType === "ALL") return sessions;
    return sessions.filter((s) => s.type === filterType);
  }, [sessions, filterType]);

  const grouped = useMemo(() => {
    const groups: Record<string, SleepSession[]> = {};
    for (const s of filtered) {
      const day = format(new Date(s.start_time), "yyyy-MM-dd");
      if (!groups[day]) groups[day] = [];
      groups[day].push(s);
    }
    return groups;
  }, [filtered]);

  const todaySessions = useMemo(
    () => sessions.filter((s) => isToday(new Date(s.start_time))),
    [sessions]
  );

  const todayStats = useMemo(() => {
    const completed = todaySessions.filter((s) => s.duration_min != null);
    const totalMin = completed.reduce((a, s) => a + (s.duration_min ?? 0), 0);
    const naps = completed.filter((s) => s.type === "NAP");
    const longest = completed.length
      ? Math.max(...completed.map((s) => s.duration_min ?? 0))
      : 0;
    return {
      totalSleep: totalMin,
      napCount: naps.length,
      longestStretch: longest,
    };
  }, [todaySessions]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto md:mx-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Registro de Sono</h1>
        <Button
          onClick={() => {
            setEditSession(null);
            setShowForm(true);
          }}
          className="rounded-full gap-2 px-5"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Adicionar
        </Button>
      </div>

      {/* Today summary */}
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Resumo de hoje
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">
              {formatDuration(todayStats.totalSleep)}
            </p>
            <p className="text-xs text-muted-foreground">Total de sono</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{todayStats.napCount}</p>
            <p className="text-xs text-muted-foreground">Sonecas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {formatDuration(todayStats.longestStretch)}
            </p>
            <p className="text-xs text-muted-foreground">Maior trecho</p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={filterType} onValueChange={(v) => v && setFilterType(v)}>
          <SelectTrigger className="w-[140px] rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="NAP">
              <span className="flex items-center gap-1">
                <Sun className="h-3 w-3" /> Sonecas
              </span>
            </SelectItem>
            <SelectItem value="NIGHT_SLEEP">
              <span className="flex items-center gap-1">
                <Moon className="h-3 w-3" /> Noturno
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={daysBack.toString()}
          onValueChange={(v) => v && setDaysBack(parseInt(v))}
        >
          <SelectTrigger className="w-[140px] rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="14">14 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grouped sessions */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Clock className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Nenhum registro encontrado neste período
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([day, daySessions]) => (
              <div key={day} className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background/90 backdrop-blur-sm py-1 z-10">
                  {isToday(new Date(day))
                    ? "Hoje"
                    : format(new Date(day), "EEEE, d 'de' MMMM", {
                        locale: ptBR,
                      })}
                </h3>
                <div className="space-y-2">
                  {daySessions.map((session) => (
                    <SleepCard
                      key={session.id}
                      session={session}
                      onEdit={(s) => {
                        setEditSession(s);
                        setShowForm(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      <SleepForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditSession(null);
        }}
        session={editSession}
      />
    </div>
  );
}
