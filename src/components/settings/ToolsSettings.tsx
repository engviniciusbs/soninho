"use client";

import { useState } from "react";
import { toast } from "sonner";
import { IconSend } from "@/components/brand/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PeriodPicker } from "@/components/settings/PeriodPicker";
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
    <Card>
      <CardHeader>
        <CardTitle>Relatório por e-mail</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base text-sn-mu">
          Receba agora no seu e-mail o mesmo resumo do relatório semanal: sono
          total por dia, média de soneca, maior trecho noturno, aderência à meta
          e melhor ambiente, para todos os bebês da conta.
        </p>

        <PeriodPicker
          label="Período"
          options={REPORT_PERIOD_OPTIONS}
          value={periodDays}
          onChange={setPeriodDays}
        />

        <Button size="md" onClick={handleSendReport} loading={sending} className="w-full">
          {!sending && <IconSend />}
          {sending ? "Enviando…" : "Enviar relatório agora"}
        </Button>

        <p className="text-sm text-sn-mu">
          Limite de uma solicitação por período a cada hora. O e-mail vai para o
          endereço da sua conta.
        </p>
      </CardContent>
    </Card>
  );
}
