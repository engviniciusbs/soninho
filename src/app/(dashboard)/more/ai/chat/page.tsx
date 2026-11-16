"use client";

import { useBaby } from "@/components/providers/BabyProvider";
import { DetailHeader } from "@/components/ui/detail-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AIChat } from "@/components/ai/AIChat";
import { NoBabyNotice } from "@/components/settings/NoBabyNotice";

export default function MoreAIChatPage() {
  const { activeBaby, isLoading } = useBaby();

  return (
    <div>
      <DetailHeader title="Pergunte à IA" backHref="/more" />
      {isLoading ? (
        <Skeleton className="h-64 rounded-[24px]" role="status" aria-label="Carregando" />
      ) : activeBaby ? (
        // Fills the viewport under the sticky top bar; the bottom nav is
        // ~88px on mobile and absent on desktop (layout `pb-32 md:pb-12`).
        <div className="h-[calc(100dvh-15rem)] min-h-80 md:h-[calc(100dvh-11rem)]">
          <AIChat />
        </div>
      ) : (
        <NoBabyNotice>Adicione um bebê para conversar com a IA sobre o sono dele.</NoBabyNotice>
      )}
    </div>
  );
}
