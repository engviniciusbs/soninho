"use client";

import { useState } from "react";
import { Mail, Loader2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  REPORT_PERIOD_OPTIONS,
  type ReportPeriodDays,
} from "@/lib/email/reportConstants";

export function ToolsSettings() {
  const [periodDays, setPeriodDays] = useState<ReportPeriodDays>(7);
  const [sending, setSending] = useState(false);

  async function handleSendReport() {
    setSending(true);
    try {
      const res = await fetch("/api/email/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: periodDays }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        email?: string;
      };

      if (res.ok) {
        toast.success(
          data.email
            ? `Relatório enviado para ${data.email}`
            : "Relatório enviado com sucesso!"
        );
        return;
      }

      toast.error(data.error ?? "Erro ao enviar relatório");
    } catch {
      toast.error("Erro de rede ao enviar relatório");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Relatório por e-mail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Receba agora no seu e-mail o mesmo resumo do relatório semanal: sono
          total por dia, média de soneca, maior trecho noturno, aderência à meta
          e melhor ambiente — para todos os bebês da conta.
        </p>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Período</label>
          <div className="flex flex-wrap gap-2">
            {REPORT_PERIOD_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setPeriodDays(days)}
                aria-pressed={periodDays === days}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  periodDays === days
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {days} dias
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSendReport}
          disabled={sending}
          className="rounded-xl gap-2 w-full sm:w-auto"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {sending ? "Enviando…" : "Enviar relatório agora"}
        </Button>

        <p className="text-xs text-muted-foreground">
          Limite de uma solicitação por período a cada hora. O e-mail vai para o
          endereço da sua conta.
        </p>
      </CardContent>
    </Card>
  );
}
