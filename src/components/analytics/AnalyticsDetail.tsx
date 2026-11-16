"use client";

import { Suspense, type ReactNode } from "react";
import { useBaby } from "@/components/providers/BabyProvider";
import { DetailHeader } from "@/components/ui/detail-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsData, type AnalyticsData } from "@/components/analytics/useAnalyticsData";
import { usePeriod, withPeriod, type AnalyticsPeriod } from "@/components/analytics/period";
import { AnalyticsEmpty, AnalyticsError } from "@/components/analytics/AnalyticsStates";

interface AnalyticsDetailProps {
  title: string;
  /**
   * What counts as nothing to show: `history` (no sleep in the fetched
   * window, for figures that do not follow the period) or `period`.
   */
  emptyWhen: "history" | "period";
  children: (data: AnalyticsData, period: AnalyticsPeriod) => ReactNode;
}

function DetailFallback() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <Skeleton className="h-[220px] w-full rounded-[24px]" />
      <Skeleton className="h-[220px] w-full rounded-[24px]" />
    </div>
  );
}

function DetailBody({ title, emptyWhen, children }: AnalyticsDetailProps) {
  const [period] = usePeriod();
  const { isLoading: babyLoading } = useBaby();
  const data = useAnalyticsData(period);
  const empty = emptyWhen === "history" ? data.sessions.length === 0 : data.periodSessions.length === 0;

  return (
    <>
      <DetailHeader title={title} backHref={withPeriod("/analytics", period)} />
      <div className="flex flex-col gap-3">
        {babyLoading || data.isLoading ? (
          <DetailFallback />
        ) : data.isError ? (
          <AnalyticsError onRetry={() => void data.refetch()} />
        ) : empty ? (
          <AnalyticsEmpty
            message={emptyWhen === "history" ? "Nenhum sono registrado ainda." : "Nenhum sono registrado neste período."}
          />
        ) : (
          children(data, period)
        )}
      </div>
    </>
  );
}

/** A detail screen of Análise: back to `/analytics` keeping `?periodo=`, then its content with every load state. */
export function AnalyticsDetail(props: AnalyticsDetailProps) {
  return (
    <div>
      <Suspense
        fallback={
          <>
            <DetailHeader title={props.title} backHref="/analytics" />
            <DetailFallback />
          </>
        }
      >
        <DetailBody {...props} />
      </Suspense>
    </div>
  );
}
