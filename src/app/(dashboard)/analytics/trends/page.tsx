"use client";

import { useId } from "react";
import { AnalyticsDetail } from "@/components/analytics/AnalyticsDetail";
import { SleepQualityTrend } from "@/components/charts/SleepQualityTrend";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** A trend in a card; the chart's text alternative is named by the card title. */
function TrendCard({
  title,
  period,
  children,
}: {
  title: string;
  period: number;
  children: (titleId: string) => React.ReactNode;
}) {
  const titleId = useId();
  return (
    <Card>
      <CardHeader>
        <CardTitle id={titleId} className="text-base">
          {title}
        </CardTitle>
        <CardDescription>Por dia, nos últimos {period} dias</CardDescription>
      </CardHeader>
      <CardContent>{children(titleId)}</CardContent>
    </Card>
  );
}

export default function AnalyticsTrendsPage() {
  return (
    <AnalyticsDetail title="Tendências" emptyWhen="period">
      {({ avgNapTrend, napCounts, nightStretch }, period) => (
        <>
          <TrendCard title="Duração média das sonecas" period={period}>
            {(id) => <SleepQualityTrend data={avgNapTrend} labelledBy={id} valueHeader="Duração média" />}
          </TrendCard>
          <TrendCard title="Sonecas por dia" period={period}>
            {(id) => (
              <SleepQualityTrend
                data={napCounts.map((d) => ({ date: d.date, avgDuration: d.count }))}
                labelledBy={id}
                valueHeader="Sonecas"
                label="Sonecas"
                unit=""
              />
            )}
          </TrendCard>
          <TrendCard title="Maior trecho noturno" period={period}>
            {(id) => (
              <SleepQualityTrend
                data={nightStretch.map((d) => ({ date: d.date, avgDuration: d.hours }))}
                labelledBy={id}
                valueHeader="Horas"
                label="Horas"
                color="var(--sn-night)"
                unit="h"
              />
            )}
          </TrendCard>
        </>
      )}
    </AnalyticsDetail>
  );
}
