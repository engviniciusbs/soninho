"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconRefresh } from "@/components/brand/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedControl } from "@/components/ui/segmented-control";

type InsightSection = "todayAssessment" | "patternRecognition" | "weeklyTrends" | "recommendations";

const SECTION_LABELS: Record<InsightSection, string> = {
  todayAssessment: "Avaliação de hoje",
  patternRecognition: "Padrões identificados",
  weeklyTrends: "Tendências da semana",
  recommendations: "Recomendações",
};

type InsightTab = "today" | "patterns" | "recommendations";

/** The four analyses of the old /ai-insights page, grouped in three tabs. */
const TABS: { value: InsightTab; label: string; sections: InsightSection[] }[] = [
  { value: "today", label: "Hoje", sections: ["todayAssessment"] },
  { value: "patterns", label: "Padrões", sections: ["patternRecognition", "weeklyTrends"] },
  { value: "recommendations", label: "Recomendações", sections: ["recommendations"] },
];

async function fetchInsight(babyId: string, section: InsightSection): Promise<string> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      babyId,
      messages: [
        {
          role: "user",
          content: getPromptForSection(section),
        },
      ],
    }),
  });

  if (!res.ok) throw new Error("Failed to fetch insight");

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No reader");

  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) result += parsed.text;
        } catch {
          // skip
        }
      }
    }
  }

  return result;
}

function getPromptForSection(section: InsightSection): string {
  const prompts: Record<InsightSection, string> = {
    todayAssessment:
      "Analise o padrão de sono de hoje do bebê. Avalie se as sonecas e o sono noturno estão dentro do esperado para a idade. Seja breve (3-4 frases) e encoraje os pais.",
    patternRecognition:
      "Identifique padrões nos últimos 7 dias de sono. Procure por consistência nos horários, tendência na duração das sonecas, qualidade do sono noturno e evolução das janelas de vigília. Seja específico.",
    weeklyTrends:
      "Analise as tendências da semana: O total de sono está adequado? As sonecas estão ficando mais longas ou mais curtas? O sono noturno está melhorando? Avaliação honesta mas encorajadora.",
    recommendations:
      "Forneça 3-4 recomendações práticas e específicas para melhorar o sono do bebê. Considere ajustes nos horários, duração ideal das sonecas, ambiente de sono e rotina de transição. Numere cada recomendação.",
  };
  return prompts[section];
}

function InsightCard({ section, babyId }: { section: InsightSection; babyId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["insight", babyId, section],
    queryFn: () => fetchInsight(babyId, section),
    staleTime: 10 * 60 * 1000,
    enabled: !!babyId,
  });

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle>{SECTION_LABELS[section]}</CardTitle>
        <Button
          variant="icon"
          size="icon"
          className="-my-2 -mr-2"
          onClick={() =>
            queryClient.invalidateQueries({
              queryKey: ["insight", babyId, section],
            })
          }
          disabled={isLoading}
          aria-label="Regenerar"
        >
          <IconRefresh size={20} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2.5" role="status" aria-label="Gerando análise">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : error ? (
          <p className="text-base text-sn-mu">
            Não foi possível gerar esta análise. Toque em regenerar para tentar de novo.
          </p>
        ) : (
          <p className="text-base leading-relaxed whitespace-pre-wrap text-sn-tx">{data}</p>
        )}
      </CardContent>
    </Card>
  );
}

/** Mais › Resumos da IA: tabs Hoje, Padrões and Recomendações. */
export function AIInsights({ babyId }: { babyId: string }) {
  const [tab, setTab] = useState<InsightTab>("today");
  const current = TABS.find((t) => t.value === tab) ?? TABS[0];

  return (
    <div className="flex flex-col gap-3.5">
      <SegmentedControl
        aria-label="Resumo"
        size="sm"
        value={tab}
        onChange={setTab}
        options={TABS.map(({ value, label }) => ({ value, label }))}
      />
      {current.sections.map((section) => (
        <InsightCard key={section} section={section} babyId={babyId} />
      ))}
    </div>
  );
}
