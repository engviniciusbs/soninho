"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { toCsv } from "@/lib/export/csv";
import { useBaby } from "@/components/providers/BabyProvider";
import { ToolsSettings } from "@/components/settings/ToolsSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SleepSession } from "@/types";

const CSV_HEADERS = ["Tipo", "Início", "Fim", "Duração (min)", "Qualidade", "Local", "Notas"];

function sessionsToCsv(sessions: SleepSession[]): string {
  const rows = sessions.map((s) => [
    s.type === "NAP" ? "Soneca" : "Sono Noturno",
    s.start_time,
    s.end_time ?? "",
    s.duration_min?.toString() ?? "",
    s.quality?.toString() ?? "",
    s.location ?? "",
    s.notes ?? "",
  ]);
  return toCsv([CSV_HEADERS, ...rows]);
}

/** "Ferramentas" tab: e-mailed report on demand and CSV export of the active baby. */
export function ToolsTab() {
  const { activeBaby } = useBaby();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!activeBaby) return;
    setExporting(true);

    try {
      const { data } = (await createClient()
        .from("sleep_sessions")
        .select("*")
        .eq("baby_id", activeBaby.id)
        .order("start_time", { ascending: false })) as { data: SleepSession[] | null };

      if (!data || data.length === 0) {
        toast.info("Nenhum registro para exportar");
        setExporting(false);
        return;
      }

      const blob = new Blob([sessionsToCsv(data)], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `soninho-${activeBaby.name}-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Dados exportados com sucesso");
    } catch {
      toast.error("Erro ao exportar dados");
    }

    setExporting(false);
  }

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
            onClick={handleExport}
            disabled={!activeBaby || exporting}
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
