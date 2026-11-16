"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { startOfDay, subDays } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getSleepSessions } from "@/lib/supabase/queries/sleep";
import { useBaby } from "@/components/providers/BabyProvider";
import { IconDoc } from "@/components/brand/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PeriodPicker } from "@/components/settings/PeriodPicker";
import type { SleepSession } from "@/types";

const PDF_PERIOD_OPTIONS = [7, 14, 30] as const;
type PdfPeriodDays = (typeof PDF_PERIOD_OPTIONS)[number];

/**
 * PDF sleep report for the pediatrician (spec §8.10: moved here from /history).
 * The query and the handler are the ones the history page had: same key, same
 * window of `daysBack` days, same report builder and file name.
 */
export function SleepReportPdfCard() {
  const { activeBaby } = useBaby();
  const supabase = createClient();
  const [daysBack, setDaysBack] = useState<PdfPeriodDays>(7);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const from = subDays(startOfDay(new Date()), daysBack);
  const to = new Date();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sleep-sessions", activeBaby?.id, daysBack],
    queryFn: async (): Promise<SleepSession[]> => {
      if (!activeBaby) return [];
      const { data, error } = await getSleepSessions(supabase, activeBaby.id, from, to);
      if (error) throw error;
      return (data ?? []) as SleepSession[];
    },
    enabled: !!activeBaby,
  });

  async function handleGeneratePdf() {
    if (!activeBaby) return;
    const completed = sessions.filter((s) => s.duration_min != null);
    if (completed.length === 0) {
      toast.info("Nenhum registro no período para gerar o relatório");
      return;
    }
    setGeneratingPdf(true);
    try {
      const [{ pdf }, { SleepReportPdf, buildSleepReportData }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/report/SleepReportPdf"),
      ]);

      const data = buildSleepReportData(
        sessions,
        { name: activeBaby.name, birth_date: activeBaby.birth_date },
        daysBack
      );

      const blob = await pdf(<SleepReportPdf data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `soninho-relatorio-${activeBaby.name}-${new Date()
        .toISOString()
        .split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Relatório gerado!");
    } catch (err) {
      console.error("[pdf] generation failed:", err);
      toast.error("Erro ao gerar o relatório");
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório para o pediatra</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base text-sn-mu">
          Um PDF com o resumo do período e o sono de cada dia do bebê ativo, pronto para levar
          à consulta.
        </p>
        <PeriodPicker
          label="Período"
          options={PDF_PERIOD_OPTIONS}
          value={daysBack}
          onChange={setDaysBack}
        />
        <Button
          size="md"
          onClick={handleGeneratePdf}
          loading={generatingPdf}
          disabled={!activeBaby || isLoading}
          className="w-full"
        >
          {!generatingPdf && <IconDoc />}
          Gerar PDF
        </Button>
      </CardContent>
    </Card>
  );
}
