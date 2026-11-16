"use client";

import { useId } from "react";
import { AnalyticsDetail } from "@/components/analytics/AnalyticsDetail";
import { SleepQualityTrend } from "@/components/charts/SleepQualityTrend";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsQualityPage() {
  const titleId = useId();
  return (
    <AnalyticsDetail title="Qualidade do sono" emptyWhen="period">
      {({ dailyQuality }, period) =>
        dailyQuality.every((d) => d.avgQuality === null) ? (
          <Card className="gap-2 px-[18px]">
            <p className="font-sans text-base font-bold text-sn-tx">Nenhuma nota de qualidade neste período.</p>
            <p className="font-sans text-[15px] font-semibold text-sn-mu">
              Avalie a qualidade ao terminar um sono para ver a tendência aqui.
            </p>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle id={titleId} className="text-base">
                Qualidade média por dia
              </CardTitle>
              <CardDescription>Nota de 1 a 5 dos sonos avaliados, nos últimos {period} dias. Dias sem nota ficam em branco.</CardDescription>
            </CardHeader>
            <CardContent>
              <SleepQualityTrend
                data={dailyQuality.map((d) => ({ date: d.date, avgDuration: d.avgQuality }))}
                labelledBy={titleId}
                valueHeader="Nota (1 a 5)"
                label="Qualidade"
                unit=""
                domain={[1, 5]}
              />
            </CardContent>
          </Card>
        )
      }
    </AnalyticsDetail>
  );
}
