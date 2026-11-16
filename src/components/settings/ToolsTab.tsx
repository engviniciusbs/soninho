"use client";

import type { SleepExport } from "@/hooks/settings/useSleepExport";
import { ToolsSettings } from "@/components/settings/ToolsSettings";
import { SleepReportPdfCard } from "@/components/settings/SleepReportPdfCard";
import { IconDownload } from "@/components/brand/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Mais › Relatórios e exportar: PDF for the pediatrician, e-mailed report and
 * CSV export of the active baby (export state comes from the page). */
export function ToolsTab({ sleepExport }: { sleepExport: SleepExport }) {
  const { exporting, exportCsv, canExport } = sleepExport;

  return (
    <div className="flex flex-col gap-3.5">
      <SleepReportPdfCard />

      <ToolsSettings />

      <Card>
        <CardHeader>
          <CardTitle>Exportar dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base text-sn-mu">
            Exporte todos os registros de sono do bebê ativo em formato CSV.
          </p>
          <Button
            variant="secondary"
            size="md"
            onClick={exportCsv}
            disabled={!canExport || exporting}
            className="w-full"
          >
            <IconDownload />
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
