"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getSleepSessions } from "@/lib/supabase/queries";
import { useBaby } from "@/components/providers/BabyProvider";
import { SleepCard } from "@/components/sleep/SleepCard";
import { SleepForm } from "@/components/sleep/SleepForm";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Clock, Moon, Sun, FileDown, Loader2 } from "lucide-react";
import { format, startOfDay, subDays, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDuration } from "@/lib/utils";
import { toast } from "sonner";
import type { SleepSession } from "@/types";

export default function HistoryPage() {
  const { activeBaby } = useBaby();
  const supabase = createClient();
  const [showForm, setShowForm] = useState(false);
  const [editSession, setEditSession] = useState<SleepSession | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [daysBack, setDaysBack] = useState(7);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const from = subDays(startOfDay(new Date()), daysBack);
  const to = new Date();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sleep-sessions", activeBaby?.id, daysBack],
    queryFn: async (): Promise<SleepSession[]> => {
      if (!activeBaby) return [];
      const { data, error } = await getSleepSessions(
        supabase,
        activeBaby.id,
        from,
        to
      );
      if (error) throw error;
      return (data ?? []) as SleepSession[];
    },
    enabled: !!activeBaby,
  });

  const filtered = useMemo(() => {
    if (filterType === "ALL") return sessions;
    return sessions.filter((s) => s.type === filterType);
  }, [sessions, filterType]);

  const grouped = useMemo(() => {
    const groups: Record<string, SleepSession[]> = {};
    for (const s of filtered) {
      const day = format(new Date(s.start_time), "yyyy-MM-dd");
      if (!groups[day]) groups[day] = [];
      groups[day].push(s);
    }
    return groups;
  }, [filtered]);

  const todaySessions = useMemo(
    () => sessions.filter((s) => isToday(new Date(s.start_time))),
    [sessions]
  );

  async function handleGeneratePdf() {
    if (!activeBaby) return;
    const completed = sessions.filter((s) => s.duration_min != null);
    if (completed.length === 0) {
      toast.info("Nenhum registro no período para gerar o relatório");
      return;
    }
    setGeneratingPdf(true);
    try {
      const [{ pdf }, { SleepReportPdf, buildSleepReportData }] =
        await Promise.all([
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

  const todayStats = useMemo(() => {
    const completed = todaySessions.filter((s) => s.duration_min != null);
    const totalMin = completed.reduce((a, s) => a + (s.duration_min ?? 0), 0);
    const naps = completed.filter((s) => s.type === "NAP");
    const longest = completed.length
      ? Math.max(...completed.map((s) => s.duration_min ?? 0))
      : 0;
    return {
      totalSleep: totalMin,
      napCount: naps.length,
      longestStretch: longest,
    };
  }, [todaySessions]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto md:mx-0">
      <PageHeader
        title="Registro de sono"
        subtitle="Histórico de sonecas e noites"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
              className="rounded-full gap-2 px-4"
            >
              {generatingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileDown className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Relatório (PDF)</span>
            </Button>
            <Button
              onClick={() => {
                setEditSession(null);
                setShowForm(true);
              }}
              className="rounded-full gap-2 px-5"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar
            </Button>
          </div>
        }
      />

      {/* Today summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile
          icon={<Clock className="h-4 w-4" />}
          label="Total de sono"
          value={formatDuration(todayStats.totalSleep)}
          sub="Hoje"
        />
        <StatTile
          icon={<Sun className="h-4 w-4" />}
          label="Sonecas"
          value={todayStats.napCount}
          sub="Hoje"
        />
        <StatTile
          icon={<Moon className="h-4 w-4" />}
          label="Maior trecho"
          value={formatDuration(todayStats.longestStretch)}
          sub="Hoje"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={filterType} onValueChange={(v) => v && setFilterType(v)}>
          <SelectTrigger className="w-[140px] rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="NAP">
              <span className="flex items-center gap-1">
                <Sun className="h-3 w-3" /> Sonecas
              </span>
            </SelectItem>
            <SelectItem value="NIGHT_SLEEP">
              <span className="flex items-center gap-1">
                <Moon className="h-3 w-3" /> Noturno
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={daysBack.toString()}
          onValueChange={(v) => v && setDaysBack(parseInt(v))}
        >
          <SelectTrigger className="w-[140px] rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="14">14 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grouped sessions */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Clock className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Nenhum registro encontrado neste período
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([day, daySessions]) => (
              <div key={day} className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background/90 backdrop-blur-sm py-1 z-10">
                  {isToday(parseISO(day))
                    ? "Hoje"
                    : format(parseISO(day), "EEEE, d 'de' MMMM", {
                        locale: ptBR,
                      })}
                </h3>
                <div className="space-y-2">
                  {daySessions.map((session) => (
                    <SleepCard
                      key={session.id}
                      session={session}
                      onEdit={(s) => {
                        setEditSession(s);
                        setShowForm(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      <SleepForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditSession(null);
        }}
        session={editSession}
      />
    </div>
  );
}
