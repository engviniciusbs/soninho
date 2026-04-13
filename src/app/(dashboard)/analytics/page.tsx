"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getRecentSessions } from "@/lib/supabase/queries";
import { useBaby } from "@/components/providers/BabyProvider";
import { getBabyAge, formatDuration } from "@/lib/utils";
import { getAgeSchedule } from "@/lib/sleep/schedules";
import {
  getDailyTotals,
  getNapCountPerDay,
  getLongestNightStretch,
  getNapPatternHeatmap,
  getLast24hStats,
  getOverallStats,
} from "@/lib/sleep/statistics";
import { SleepBarChart } from "@/components/charts/SleepBarChart";
import { NapPatternHeatmap } from "@/components/charts/NapPatternHeatmap";
import { SleepQualityTrend } from "@/components/charts/SleepQualityTrend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Clock, Moon, Sun } from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval, isYesterday, isToday } from "date-fns";
import type { SleepSession } from "@/types";

export default function AnalyticsPage() {
  const { activeBaby } = useBaby();
  const supabase = createClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sleep-sessions", activeBaby?.id, "analytics"],
    queryFn: async (): Promise<SleepSession[]> => {
      if (!activeBaby) return [];
      const { data, error } = await getRecentSessions(
        supabase,
        activeBaby.id,
        30
      );
      if (error) throw error;
      return (data ?? []) as SleepSession[];
    },
    enabled: !!activeBaby,
  });

  const ageWeeks = activeBaby
    ? getBabyAge(activeBaby.birth_date).weeks
    : 12;
  const schedule = getAgeSchedule(ageWeeks);

  const last24h = useMemo(() => getLast24hStats(sessions), [sessions]);

  const last7dSessions = useMemo(() => {
    const cutoff = subDays(new Date(), 7);
    return sessions.filter((s) => new Date(s.start_time) >= cutoff);
  }, [sessions]);

  const stats7d = useMemo(() => getOverallStats(last7dSessions), [last7dSessions]);

  const dailyTotals = useMemo(
    () => getDailyTotals(sessions, 7),
    [sessions]
  );

  const napCounts = useMemo(
    () => getNapCountPerDay(sessions, 7),
    [sessions]
  );

  const nightStretch = useMemo(
    () => getLongestNightStretch(sessions, 7),
    [sessions]
  );

  const heatmapData = useMemo(
    () => getNapPatternHeatmap(sessions),
    [sessions]
  );

  const avgNapTrend = useMemo(() => {
    const end = new Date();
    const start = subDays(startOfDay(end), 6);
    const days = eachDayOfInterval({ start, end });

    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const naps = sessions.filter(
        (s: SleepSession) =>
          format(new Date(s.start_time), "yyyy-MM-dd") === dayStr &&
          s.type === "NAP" &&
          s.duration_min != null
      );
      const avg =
        naps.length > 0
          ? naps.reduce((a: number, s: SleepSession) => a + (s.duration_min ?? 0), 0) / naps.length
          : 0;
      return {
        date: format(day, "dd/MM"),
        avgDuration: Math.round(avg),
      };
    });
  }, [sessions]);

  const todayNaps = useMemo(
    () =>
      sessions.filter(
        (s) => isToday(new Date(s.start_time)) && s.type === "NAP"
      ).length,
    [sessions]
  );

  const yesterdayNaps = useMemo(
    () =>
      sessions.filter(
        (s) => isYesterday(new Date(s.start_time)) && s.type === "NAP"
      ).length,
    [sessions]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Análise de Sono</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Sono 24h"
          value={formatDuration(last24h.totalSleepMinutes)}
          sub={`Meta: ${schedule.totalSleepHours}h`}
        />
        <StatCard
          icon={<Moon className="h-4 w-4" />}
          label="Média soneca (7d)"
          value={formatDuration(stats7d.avgNapDuration)}
          sub={`${stats7d.napCount} sonecas`}
        />
        <StatCard
          icon={<Sun className="h-4 w-4" />}
          label="Sonecas hoje"
          value={todayNaps.toString()}
          sub={`Ontem: ${yesterdayNaps}`}
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Maior trecho noturno"
          value={formatDuration(last24h.longestStretch)}
          sub="Últimas 24h"
        />
      </div>

      {/* Charts */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Sono total por dia (7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SleepBarChart
            data={dailyTotals}
            recommendedHours={schedule.totalSleepHours}
          />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Duração média das sonecas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SleepQualityTrend data={avgNapTrend} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Sonecas por dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SleepQualityTrend
              data={napCounts.map((d) => ({
                date: d.date,
                avgDuration: d.count,
              }))}
              label="Sonecas"
              color="#6366f1"
              unit=""
            />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Maior trecho noturno
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SleepQualityTrend
            data={nightStretch.map((d) => ({
              date: d.date,
              avgDuration: d.hours,
            }))}
            label="Horas"
            color="#93c5fd"
            unit="h"
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Padrão de sonecas por hora e dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NapPatternHeatmap data={heatmapData} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
