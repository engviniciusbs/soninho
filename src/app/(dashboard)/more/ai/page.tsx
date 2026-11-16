"use client";

import { useBaby } from "@/components/providers/BabyProvider";
import { DetailHeader } from "@/components/ui/detail-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AIInsights } from "@/components/ai/AIInsights";
import { NoBabyNotice } from "@/components/settings/NoBabyNotice";

export default function MoreAIPage() {
  const { activeBaby, isLoading } = useBaby();

  return (
    <div>
      <DetailHeader title="Resumos da IA" backHref="/more" />
      {isLoading ? (
        <div className="flex flex-col gap-3.5" role="status" aria-label="Carregando">
          <Skeleton className="h-[54px] rounded-full" />
          <Skeleton className="h-40 rounded-[24px]" />
        </div>
      ) : activeBaby ? (
        <AIInsights babyId={activeBaby.id} />
      ) : (
        <NoBabyNotice>Adicione um bebê para ver os resumos da IA sobre o sono dele.</NoBabyNotice>
      )}
    </div>
  );
}
