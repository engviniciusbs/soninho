"use client";

import { useState } from "react";
import { useBaby } from "@/components/providers/BabyProvider";
import { AIChat } from "@/components/ai/AIChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Sparkles, MessageCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type InsightSection = "todayAssessment" | "patternRecognition" | "weeklyTrends" | "recommendations";

const SECTION_LABELS: Record<InsightSection, string> = {
  todayAssessment: "Avaliação de Hoje",
  patternRecognition: "Padrões Identificados",
  weeklyTrends: "Tendências da Semana",
  recommendations: "Recomendações",
};

async function fetchInsight(
  babyId: string,
  section: InsightSection
): Promise<string> {
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

function InsightCard({
  section,
  babyId,
}: {
  section: InsightSection;
  babyId: string;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["insight", babyId, section],
    queryFn: () => fetchInsight(babyId, section),
    staleTime: 10 * 60 * 1000,
    enabled: !!babyId,
  });

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {SECTION_LABELS[section]}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() =>
            queryClient.invalidateQueries({
              queryKey: ["insight", babyId, section],
            })
          }
          aria-label="Regenerar"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-4/5 rounded" />
            <Skeleton className="h-4 w-3/5 rounded" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">
            Não foi possível gerar esta análise. Tente novamente.
          </p>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{data}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AIInsightsPage() {
  const { activeBaby } = useBaby();

  if (!activeBaby) {
    return (
      <div className="flex flex-col items-center gap-4 pt-12">
        <Sparkles className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-muted-foreground">
          Adicione um bebê para ver as análises da IA.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inteligência"
        title="IA Insights"
        subtitle="Análises e conversa sobre o sono do bebê"
      />

      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="rounded-xl w-full">
          <TabsTrigger value="insights" className="rounded-lg flex-1 gap-2">
            <Sparkles className="h-4 w-4" />
            Análise
          </TabsTrigger>
          <TabsTrigger value="chat" className="rounded-lg flex-1 gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4 mt-4">
          {(
            [
              "todayAssessment",
              "patternRecognition",
              "weeklyTrends",
              "recommendations",
            ] as InsightSection[]
          ).map((section) => (
            <InsightCard
              key={section}
              section={section}
              babyId={activeBaby.id}
            />
          ))}
        </TabsContent>

        <TabsContent value="chat" className="mt-4 h-[calc(100vh-280px)]">
          <AIChat />
        </TabsContent>
      </Tabs>
    </div>
  );
}
