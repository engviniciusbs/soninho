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

/** PostgREST caps every answer at 1000 rows; pages are fetched with `.range()`. */
const PAGE_SIZE = 1000;

/**
 * Every sleep session of the baby, newest first. Throws on any page error.
 * Reads until an empty page: a server with a lower `max_rows` answers pages
 * shorter than asked that are not the end, so a short page never stops it.
 */
async function fetchAllSessions(babyId: string): Promise<SleepSession[]> {
  const supabase = createClient();
  const all: SleepSession[] = [];
  for (let from = 0; ; from = all.length) {
    const { data, error } = await supabase
      .from("sleep_sessions")
      .select("*")
      .eq("baby_id", babyId)
      .order("start_time", { ascending: false })
      // id breaks start_time ties so no row repeats or goes missing across pages
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as SleepSession[];
    if (page.length === 0) return all;
    all.push(...page);
  }
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
      const sessions = await fetchAllSessions(activeBaby.id);
      if (sessions.length === 0) {
        toast.info("Nenhum registro para exportar");
        return;
      }

      const blob = new Blob([sessionsToCsv(sessions)], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `soninho-${activeBaby.name}-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Dados exportados com sucesso");
    } catch {
      toast.error("Não foi possível exportar");
    } finally {
      setExporting(false);
    }
  }

  return { exporting, exportCsv, canExport: !!activeBaby };
}

export type SleepExport = ReturnType<typeof useSleepExport>;
