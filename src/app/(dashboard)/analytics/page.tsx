"use client";

import { Suspense } from "react";
import { useBaby } from "@/components/providers/BabyProvider";
import { useAnalyticsData, type AnalyticsData } from "@/components/analytics/useAnalyticsData";
import {
  ANALYTICS_PERIODS,
  usePeriod,
  withPeriod,
  parsePeriod,
} from "@/components/analytics/period";
import { AnalyticsEmpty, AnalyticsError, AnalyticsSkeleton } from "@/components/analytics/AnalyticsStates";
import { DurationFigure, formatDecimal } from "@/components/analytics/format";
import { RegressionNotice } from "@/components/home/RegressionNotice";
import { SleepBarChart } from "@/components/charts/SleepBarChart";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { PageTitle } from "@/components/ui/page-title";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChart, IconGrid, IconRadar, IconStar, IconThermometer, IconTrend } from "@/components/brand/icons";

const PERIOD_OPTIONS = ANALYTICS_PERIODS.map((p) => ({ value: String(p), label: `${p} dias` }));

const DETAILS = [
  { path: "/analytics/numbers", title: "Mais números", subtitle: "Sono 24h, débito de sono e sonecas de hoje", icon: <IconChart /> },
  { path: "/analytics/trends", title: "Tendências", subtitle: "Duração das sonecas, sonecas e noite por dia", icon: <IconTrend /> },
  { path: "/analytics/environment", title: "Ambiente e sono", subtitle: "Temperatura, TOG e clima", icon: <IconThermometer /> },
  { path: "/analytics/naps", title: "Padrão de sonecas", subtitle: "Horários ao longo da semana", icon: <IconGrid /> },
  { path: "/analytics/quality", title: "Qualidade do sono", subtitle: "Nota média por dia", icon: <IconStar /> },
  { path: "/analytics/regression", title: "Radar de regressões", subtitle: "Sinais de regressão para a idade", icon: <IconRadar /> },
];

function Figure({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 flex-col-reverse justify-end gap-0.5 rounded-[18px] border border-sn-bd bg-sn-card px-3 py-2.5">
      <dt className="font-sans text-[13px] font-semibold text-sn-mu">{label}</dt>
      <dd className="font-display text-[20px] leading-tight font-bold text-sn-tx tabular-nums">{value}</dd>
    </div>
  );
}

/** The three figures of the complete days of the period, or why there are none yet. */
function PeriodFigures({ summary }: { summary: AnalyticsData["periodSummary"] }) {
  if (summary.daysWithData === 0 || summary.avgSleepMinutes === null || summary.avgNapsPerDay === null) {
    return (
      <p className="px-1 font-sans text-[15px] font-semibold text-sn-mu">
        Os números do período aparecem depois do primeiro dia completo.
      </p>
    );
  }
  const days = summary.daysWithData;
  return (
    <section aria-label="Números do período" className="flex flex-col gap-2">
      <dl className="grid grid-cols-3 gap-2">
        <Figure value={<DurationFigure minutes={summary.avgSleepMinutes} />} label="sono por dia" />
        <Figure value={formatDecimal(summary.avgNapsPerDay)} label="sonecas por dia" />
        <Figure
          value={summary.longestNightMinutes === null ? "Nenhuma" : <DurationFigure minutes={summary.longestNightMinutes} />}
          label="maior noite"
        />
      </dl>
      <p className="px-1 font-sans text-[13px] font-semibold text-sn-mu">
        {`Médias de ${days} ${days === 1 ? "dia completo" : "dias completos"}, sem contar hoje. Maior noite: a mais longa já terminada.`}
      </p>
    </section>
  );
}

function AnalyticsView() {
  const [period, setPeriod] = usePeriod();
  const { isLoading: babyLoading } = useBaby();
  const data = useAnalyticsData(period);

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        aria-label="Período"
        size="sm"
        value={String(period)}
        onChange={(v) => setPeriod(parsePeriod(v))}
        options={PERIOD_OPTIONS}
      />

      {babyLoading || data.isLoading ? (
        <AnalyticsSkeleton />
      ) : data.isError ? (
        <AnalyticsError onRetry={() => void data.refetch()} />
      ) : data.periodSessions.length === 0 ? (
        <AnalyticsEmpty message="Nenhum sono registrado neste período." />
      ) : (
        <>
          <PeriodFigures summary={data.periodSummary} />
          <Card className="gap-3 px-[18px]">
            <h2 id="sono-por-dia" className="font-sans text-sm font-bold text-sn-mu">Sono por dia</h2>
            <SleepBarChart
              data={data.dailyTotals}
              recommendedHours={data.schedule.totalSleepHours}
              labelledBy="sono-por-dia"
            />
          </Card>
        </>
      )}

      <RegressionNotice href={withPeriod("/analytics/regression", period)} actionLabel="Ver o radar completo" />

      <Card className="gap-0 px-3.5 py-1.5">
        <ul aria-label="Mais detalhes" className="divide-y divide-sn-bd">
          {DETAILS.map((d) => (
            <li key={d.path}>
              <ListRow href={withPeriod(d.path, period)} icon={d.icon} title={d.title} subtitle={d.subtitle} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div>
      <PageTitle>Análise</PageTitle>
      <Suspense
        fallback={
          <div className="flex flex-col gap-3">
            <Skeleton className="h-[54px] w-full rounded-full" />
            <AnalyticsSkeleton />
          </div>
        }
      >
        <AnalyticsView />
      </Suspense>
    </div>
  );
}
