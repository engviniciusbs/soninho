"use client";

import { Download } from "lucide-react";
import type { SleepExport } from "@/hooks/settings/useSleepExport";
import { ToolsSettings } from "@/components/settings/ToolsSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** "Ferramentas" tab: e-mailed report on demand and CSV export of the active baby
 * (export state comes from the page so it survives tab switches). */
export function ToolsTab({ sleepExport }: { sleepExport: SleepExport }) {
  const { exporting, exportCsv, canExport } = sleepExport;

  return (
    <>
      <ToolsSettings />

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Exporte todos os registros de sono do bebê ativo em formato CSV.
          </p>
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={!canExport || exporting}
            className="rounded-xl gap-2"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
