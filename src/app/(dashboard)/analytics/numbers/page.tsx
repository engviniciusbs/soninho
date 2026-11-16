"use client";

import { AnalyticsDetail } from "@/components/analytics/AnalyticsDetail";
import { formatHours } from "@/components/analytics/format";
import { StatTile } from "@/components/ui/stat-tile";
import { IconChart, IconClock, IconMoon, IconSun, IconTrend } from "@/components/brand/icons";
import { formatDuration } from "@/lib/utils";

export default function AnalyticsNumbersPage() {
  return (
    <AnalyticsDetail title="Mais números" emptyWhen="history">
      {({ last24h, schedule, sleepDebt, statsPeriod, todayNaps, yesterdayNaps }, period) => (
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            icon={<IconClock />}
            label="Sono 24h"
            value={formatDuration(last24h.totalSleepMinutes)}
            sub={`Meta: ${formatHours(schedule.totalSleepHours)}`}
          />
          <StatTile
            icon={<IconTrend className="-scale-y-100" />}
            label="Débito de sono"
            value={
              sleepDebt.daysAnalyzed === 0
                ? "Sem dados"
                : sleepDebt.debtHours > 0
                  ? `-${formatHours(sleepDebt.debtHours)}`
                  : "Em dia"
            }
            sub={
              sleepDebt.daysAnalyzed > 0
                ? `Média ${formatHours(sleepDebt.avgHours)}/dia`
                : `Nenhum dia registrado em ${period} dias`
            }
          />
          <StatTile
            icon={<IconMoon />}
            label="Média de soneca"
            value={formatDuration(statsPeriod.avgNapDuration)}
            sub={`${statsPeriod.napCount} ${statsPeriod.napCount === 1 ? "soneca" : "sonecas"} em ${period} dias`}
          />
          <StatTile
            icon={<IconSun />}
            label="Sonecas hoje"
            value={todayNaps.toString()}
            sub={`Ontem: ${yesterdayNaps}`}
          />
          <StatTile
            icon={<IconChart />}
            label="Maior trecho noturno"
            value={formatDuration(last24h.longestStretch)}
            sub="Últimas 24h"
            className="col-span-2"
          />
        </div>
      )}
    </AnalyticsDetail>
  );
}
