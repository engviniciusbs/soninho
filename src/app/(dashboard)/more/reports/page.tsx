"use client";

import { useSleepExport } from "@/hooks/settings/useSleepExport";
import { DetailHeader } from "@/components/ui/detail-header";
import { ToolsTab } from "@/components/settings/ToolsTab";

export default function MoreReportsPage() {
  const sleepExport = useSleepExport();

  return (
    <div>
      <DetailHeader title="Relatórios e exportar" backHref="/more" />
      <ToolsTab sleepExport={sleepExport} />
    </div>
  );
}
