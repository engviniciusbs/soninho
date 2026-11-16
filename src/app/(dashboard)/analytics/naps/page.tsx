"use client";

import { AnalyticsDetail } from "@/components/analytics/AnalyticsDetail";
import { NapPatternHeatmap } from "@/components/charts/NapPatternHeatmap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsNapsPage() {
  return (
    <AnalyticsDetail title="Padrão de sonecas" emptyWhen="history">
      {({ heatmapData }) => (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sonecas por hora e dia da semana</CardTitle>
            {/* The heatmap reads the whole fetched window, not the period. */}
            <CardDescription>Pela hora em que começaram, nos últimos 90 dias. Quanto mais forte, mais sonecas.</CardDescription>
          </CardHeader>
          <CardContent>
            {heatmapData.length === 0 ? (
              <p className="font-sans text-[15px] font-semibold text-sn-mu">
                Nenhuma soneca registrada ainda. O padrão aparece conforme as sonecas forem registradas.
              </p>
            ) : (
              <NapPatternHeatmap data={heatmapData} />
            )}
          </CardContent>
        </Card>
      )}
    </AnalyticsDetail>
  );
}
