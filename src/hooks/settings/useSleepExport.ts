"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { toCsv } from "@/lib/export/csv";
import { useBaby } from "@/components/providers/BabyProvider";
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

/**
 * CSV export of the active baby's sleep sessions. Page-level so the in-flight
 * flag survives switching tabs mid-request.
 */
export function useSleepExport() {
  const { activeBaby } = useBaby();
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
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

  return { exporting, exportCsv, canExport: !!activeBaby };
}

export type SleepExport = ReturnType<typeof useSleepExport>;
