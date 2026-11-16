"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getRecentSessions } from "@/lib/supabase/queries/sleep";
import { useBaby } from "@/components/providers/BabyProvider";
import { getBabyAge } from "@/lib/utils";
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
import { getDailyQuality, summarizePeriod } from "@/lib/sleep/periodSummary";
import { format, subDays, startOfDay, eachDayOfInterval, isYesterday, isToday } from "date-fns";
import type { SleepSession } from "@/types";
import type { AnalyticsPeriod } from "@/components/analytics/period";

/**
 * The fetch and every calculation of the Análise screen, moved verbatim from
 * `analytics/page.tsx` so the detail screens read the same numbers.
 */
export function useAnalyticsData(period: AnalyticsPeriod) {
  const { activeBaby } = useBaby();
  const supabase = createClient();

  const { data: sessions = [], isLoading, isError, refetch } = useQuery({
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

  // New for the redesign: the three figures and the quality trend (pure, tested).
  const periodSummary = useMemo(
    () => summarizePeriod(sessions, period),
    [sessions, period]
  );

  const dailyQuality = useMemo(
    () => getDailyQuality(sessions, period),
    [sessions, period]
  );

  return {
    sessions,
    isLoading,
    isError,
    refetch,
    ageWeeks,
    schedule,
    last24h,
    periodSessions,
    statsPeriod,
    sleepDebt,
    envCorrelation,
    dailyTotals,
    napCounts,
    nightStretch,
    heatmapData,
    avgNapTrend,
    todayNaps,
    yesterdayNaps,
    periodSummary,
    dailyQuality,
  };
}

export type AnalyticsData = ReturnType<typeof useAnalyticsData>;
