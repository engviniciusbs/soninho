"use client";

import { useMemo, useState } from "react";
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
import { computeSleepDebt } from "@/lib/sleep/regression";
import { computeEnvironmentCorrelation } from "@/lib/sleep/environmentCorrelation";
import { allocateSessionToLocalDays } from "@/lib/sleep/sessionDayAllocation";
import { SleepBarChart } from "@/components/charts/SleepBarChart";
import { NapPatternHeatmap } from "@/components/charts/NapPatternHeatmap";
import { SleepQualityTrend } from "@/components/charts/SleepQualityTrend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Clock, Moon, Sun, Star, Thermometer, TrendingDown } from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval, isYesterday, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { SleepSession } from "@/types";

const PERIODS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
] as const;

type PeriodValue = (typeof PERIODS)[number]["value"];

export default function AnalyticsPage() {
  const { activeBaby } = useBaby();
  const supabase = createClient();
  const [period, setPeriod] = useState<PeriodValue>(7);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sleep-sessions", activeBaby?.id, "analytics"],
    queryFn: async (): Promise<SleepSession[]> => {
      if (!activeBaby) return [];
      // Always fetch the widest window and slice client-side per period.
      const { data, error } = await getRecentSessions(
        supabase,
        activeBaby.id,
        90
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

  const periodSessions = useMemo(() => {
    const cutoff = subDays(new Date(), period);
    return sessions.filter((s) => new Date(s.start_time) >= cutoff);
  }, [sessions, period]);

  const statsPeriod = useMemo(
    () => getOverallStats(periodSessions),
    [periodSessions]
  );

  const sleepDebt = useMemo(
    () => computeSleepDebt(sessions, ageWeeks, period),
    [sessions, ageWeeks, period]
  );

  const envCorrelation = useMemo(
    () => computeEnvironmentCorrelation(periodSessions),
    [periodSessions]
  );

  const dailyTotals = useMemo(
    () => getDailyTotals(sessions, period),
    [sessions, period]
  );

  const napCounts = useMemo(
    () => getNapCountPerDay(sessions, period),
    [sessions, period]
  );

  const nightStretch = useMemo(
    () => getLongestNightStretch(sessions, period),
    [sessions, period]
  );

  const heatmapData = useMemo(
    () => getNapPatternHeatmap(sessions),
    [sessions]
  );

  const avgNapTrend = useMemo(() => {
    const end = new Date();
    const start = subDays(startOfDay(end), period - 1);
    const days = eachDayOfInterval({ start, end });

    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      let napMinutesOnDay = 0;
      let napCountOnDay = 0;

      for (const s of sessions) {
        if (s.type !== "NAP" || s.duration_min == null) continue;
        const alloc = allocateSessionToLocalDays(s).find(
          (a) => a.dayKey === dayStr
        );
        if (alloc && alloc.napMinutes > 0) {
          napMinutesOnDay += alloc.napMinutes;
          napCountOnDay += 1;
        }
      }

      const avg = napCountOnDay > 0 ? napMinutesOnDay / napCountOnDay : 0;
      return {
        date: format(day, "dd/MM"),
        avgDuration: Math.round(avg),
      };
    });
  }, [sessions, period]);

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

  const periodLabel = `${period}d`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Análise de sono"
          subtitle="Padrões e tendências do período"
        />

        {/* Period toggle */}
        <div
          role="group"
          aria-label="Período de análise"
          className="inline-flex shrink-0 rounded-full surface-muted p-1"
        >
          {PERIODS.map((p) => {
            const active = period === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                aria-pressed={active}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <StatTile
          icon={<Clock className="h-4 w-4" />}
          label="Sono 24h"
          value={formatDuration(last24h.totalSleepMinutes)}
          sub={`Meta: ${schedule.totalSleepHours}h`}
        />
        <StatTile
          icon={<TrendingDown className="h-4 w-4" />}
          label="Débito de sono"
          value={sleepDebt.debtHours > 0 ? `-${sleepDebt.debtHours}h` : "Em dia"}
          sub={
            sleepDebt.daysAnalyzed > 0
              ? `Média ${sleepDebt.avgHours}h/dia`
              : "Sem dados"
          }
        />
        <StatTile
          icon={<Moon className="h-4 w-4" />}
          label={`Média soneca (${periodLabel})`}
          value={formatDuration(statsPeriod.avgNapDuration)}
          sub={`${statsPeriod.napCount} sonecas`}
        />
        <StatTile
          icon={<Sun className="h-4 w-4" />}
          label="Sonecas hoje"
          value={todayNaps.toString()}
          sub={`Ontem: ${yesterdayNaps}`}
        />
        <StatTile
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
            Sono total por dia ({periodLabel})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SleepBarChart
            data={dailyTotals}
            recommendedHours={schedule.totalSleepHours}
          />
        </CardContent>
      </Card>

      {/* Environment × Sleep */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Thermometer className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            Ambiente × Sono
          </CardTitle>
        </CardHeader>
        <CardContent>
          {envCorrelation.temperature.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Registre a temperatura do quarto ao iniciar o sono para ver a
              correlação com a qualidade e a duração.
            </p>
          ) : (
            <div className="space-y-3">
              {envCorrelation.bestTemperature && (
                <div className="rounded-xl surface-soft px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    Melhor faixa de temperatura:{" "}
                  </span>
                  <span className="font-semibold text-foreground">
                    {envCorrelation.bestTemperature.label}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    (qualidade média {envCorrelation.bestTemperature.avgQuality}
                    /5)
                  </span>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-1.5 pr-3 font-medium">Temperatura</th>
                      <th className="py-1.5 px-3 font-medium">Registros</th>
                      <th className="py-1.5 px-3 font-medium">Qualidade</th>
                      <th className="py-1.5 pl-3 font-medium">Duração média</th>
                    </tr>
                  </thead>
                  <tbody>
                    {envCorrelation.temperature.map((b) => {
                      const isBest =
                        envCorrelation.bestTemperature?.label === b.label;
                      return (
                        <tr
                          key={b.label}
                          className={cn(
                            "border-t border-border/30",
                            isBest && "text-foreground"
                          )}
                        >
                          <td className="py-2 pr-3 font-medium tabular-nums">
                            {b.label}
                          </td>
                          <td className="py-2 px-3 tabular-nums text-muted-foreground">
                            {b.count}
                          </td>
                          <td className="py-2 px-3">
                            {b.avgQuality != null ? (
                              <span className="inline-flex items-center gap-1">
                                <Star
                                  className="h-3 w-3 fill-amber-400 text-amber-400"
                                  aria-hidden="true"
                                />
                                <span className="tabular-nums">
                                  {b.avgQuality}
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2 pl-3 tabular-nums text-muted-foreground">
                            {formatDuration(b.avgDurationMin)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
