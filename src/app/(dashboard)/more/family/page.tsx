"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBaby } from "@/components/providers/BabyProvider";
import { DetailHeader } from "@/components/ui/detail-header";
import { Skeleton } from "@/components/ui/skeleton";
import { FamilySettings } from "@/components/settings/FamilySettings";
import { FamilyNoteCard } from "@/components/family/FamilyNoteCard";
import { NoBabyNotice } from "@/components/settings/NoBabyNotice";

/** Signed-in user's id, which `FamilySettings` uses to mark "(você)". */
function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (active && user) setUserId(user.id);
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
      {isLoading || (activeBaby && !userId) ? (
        <Skeleton className="h-64 rounded-[24px]" role="status" aria-label="Carregando" />
      ) : activeBaby && userId ? (
        <div className="flex flex-col gap-3.5">
          <FamilySettings babyId={activeBaby.id} currentUserId={userId} />
          <FamilyNoteCard />
        </div>
      ) : (
        <NoBabyNotice>Adicione um bebê para convidar quem cuida dele junto com você.</NoBabyNotice>
      )}
    </div>
  );
}
