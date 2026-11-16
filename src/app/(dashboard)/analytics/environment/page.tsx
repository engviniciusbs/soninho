"use client";

import { AnalyticsDetail } from "@/components/analytics/AnalyticsDetail";
import { formatDecimal } from "@/components/analytics/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EnvironmentBucket } from "@/lib/sleep/environmentCorrelation";
import { cn, formatDuration } from "@/lib/utils";

function BucketTable({ title, column, buckets, best }: { title: string; column: string; buckets: EnvironmentBucket[]; best?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <table aria-label={title} className="w-full font-sans text-[15px] tabular-nums">
          <thead>
            <tr className="text-left text-[13px] text-sn-mu">
              <th scope="col" className="py-1.5 pr-2 font-semibold">{column}</th>
              <th scope="col" className="px-2 py-1.5 text-right font-semibold">Sonos</th>
              <th scope="col" className="px-2 py-1.5 text-right font-semibold">Nota</th>
              <th scope="col" className="py-1.5 pl-2 text-right font-semibold">Duração média</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.label} className={cn("border-t border-sn-bd", b.label === best ? "text-sn-tx" : "text-sn-mu")}>
                <td className="py-2 pr-2 font-bold text-sn-tx">{b.label}</td>
                <td className="px-2 py-2 text-right font-semibold">{b.count}</td>
                <td className="px-2 py-2 text-right font-semibold">
                  {b.avgQuality != null ? formatDecimal(b.avgQuality) : "sem nota"}
                </td>
                <td className="py-2 pl-2 text-right font-semibold">{formatDuration(b.avgDurationMin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsEnvironmentPage() {
  return (
    <AnalyticsDetail title="Ambiente e sono" emptyWhen="period">
      {({ envCorrelation }, period) => (
        <>
          <p className="px-1 font-sans text-[15px] font-semibold text-sn-mu">
            Sonos dos últimos {period} dias, agrupados pelo ambiente. A nota vai de 1 a 5.
          </p>
          {envCorrelation.temperature.length === 0 ? (
            <Card className="gap-2 px-[18px]">
              <p className="font-sans text-[15px] font-semibold text-sn-mu">
                Registre a temperatura do quarto ao iniciar o sono para ver a correlação com a qualidade e a duração.
              </p>
            </Card>
          ) : (
            <>
              {envCorrelation.bestTemperature && (
                <Card size="sm" className="px-3.5">
                  <p className="font-sans text-[15px] font-semibold text-sn-mu">
                    Melhor faixa de temperatura: <strong className="font-bold text-sn-tx">{envCorrelation.bestTemperature.label}</strong>
                    {envCorrelation.bestTemperature.avgQuality != null &&
                      `, qualidade média ${formatDecimal(envCorrelation.bestTemperature.avgQuality)} de 5`}
                  </p>
                </Card>
              )}
              <BucketTable
                title="Temperatura"
                column="Faixa"
                buckets={envCorrelation.temperature}
                best={envCorrelation.bestTemperature?.label}
              />
            </>
          )}
          {envCorrelation.sleepSackTog.length > 0 && (
            <BucketTable title="Saco de dormir" column="TOG" buckets={envCorrelation.sleepSackTog} />
          )}
          {envCorrelation.weather.length > 0 && <BucketTable title="Clima" column="Clima" buckets={envCorrelation.weather} />}
        </>
      )}
    </AnalyticsDetail>
  );
}
