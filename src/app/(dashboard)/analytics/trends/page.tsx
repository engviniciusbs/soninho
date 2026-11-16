"use client";

import { AnalyticsDetail } from "@/components/analytics/AnalyticsDetail";
import { SleepQualityTrend } from "@/components/charts/SleepQualityTrend";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function TrendCard({ title, period, children }: { title: string; period: number; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Por dia, nos últimos {period} dias</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function AnalyticsTrendsPage() {
  return (
    <AnalyticsDetail title="Tendências" emptyWhen="period">
      {({ avgNapTrend, napCounts, nightStretch }, period) => (
        <>
          <TrendCard title="Duração média das sonecas" period={period}>
            <SleepQualityTrend data={avgNapTrend} caption="Duração média das sonecas" />
          </TrendCard>
          <TrendCard title="Sonecas por dia" period={period}>
            <SleepQualityTrend
              data={napCounts.map((d) => ({ date: d.date, avgDuration: d.count }))}
              caption="Sonecas por dia"
              label="Sonecas"
              unit=""
            />
          </TrendCard>
          <TrendCard title="Maior trecho noturno" period={period}>
            <SleepQualityTrend
              data={nightStretch.map((d) => ({ date: d.date, avgDuration: d.hours }))}
              caption="Maior trecho noturno"
              label="Horas"
              color="var(--sn-night)"
              unit="h"
            />
          </TrendCard>
        </>
      )}
    </AnalyticsDetail>
  );
}
