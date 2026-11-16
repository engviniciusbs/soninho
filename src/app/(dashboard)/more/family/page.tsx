"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBaby } from "@/components/providers/BabyProvider";
import { DetailHeader } from "@/components/ui/detail-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { FamilySettings } from "@/components/settings/FamilySettings";
import { FamilyNoteCard } from "@/components/family/FamilyNoteCard";
import { NoBabyNotice } from "@/components/settings/NoBabyNotice";

/**
 * Signed-in user's id, which `FamilySettings` uses to mark "(você)".
 * `undefined` while loading, `null` when it could not be resolved.
 */
function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (active) setUserId(user?.id ?? null);
      })
      .catch(() => {
        if (active) setUserId(null);
      });
    return () => {
      active = false;
    };
  }, []);
  return userId;
}

export default function MoreFamilyPage() {
  const { activeBaby, isLoading } = useBaby();
  const userId = useCurrentUserId();

  return (
    <div>
      <DetailHeader title="Família" backHref="/more" />
      {isLoading || (activeBaby && userId === undefined) ? (
        <Skeleton className="h-64 rounded-[24px]" role="status" aria-label="Carregando" />
      ) : activeBaby && userId === null ? (
        <Card role="alert" className="items-start gap-4 px-[18px]">
          <p className="text-base text-sn-mu">
            Não foi possível carregar sua conta. Recarregue a página para ver quem acompanha o bebê.
          </p>
        </Card>
      ) : activeBaby && userId ? (
        <div className="flex flex-col gap-3.5">
          <FamilySettings babyId={activeBaby.id} currentUserId={userId} />
          <FamilyNoteCard />
        </div>
      ) : (
        <NoBabyNotice>Adicione um bebê para convidar quem vai cuidar junto com você.</NoBabyNotice>
      )}
    </div>
  );
}
