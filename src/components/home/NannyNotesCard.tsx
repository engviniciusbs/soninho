"use client";

import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FamilyNoteCard } from "@/components/family/FamilyNoteCard";
import { useBaby } from "@/components/providers/BabyProvider";
import type { FamilyNote } from "@/types";

interface NotesResponse {
  data: FamilyNote[];
  memberCount: number;
}

/**
 * The nanny's view of the family board (spec §8.2): the latest note and
 * "Ver todos", which opens the whole board in a sheet. Same query as
 * FamilyNoteCard, so both share one cached list.
 */
export function NannyNotesCard() {
  const titleId = useId();
  const { activeBaby } = useBaby();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<NotesResponse | null>({
    queryKey: ["family-notes", activeBaby?.id],
    queryFn: async () => {
      if (!activeBaby) return null;
      const res = await fetch(`/api/family/notes?babyId=${activeBaby.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!activeBaby,
    staleTime: 30 * 1000,
  });

  if (isLoading) return <Skeleton className="h-28 rounded-[24px]" />;
  if (!data) return null;

  const latest = data.data[0] ?? null;

  return (
    <Card role="region" aria-labelledby={titleId} className="gap-2 px-[18px]">
      <div className="flex items-center justify-between">
        <h2 id={titleId} className="font-sans text-lg font-bold text-sn-tx">
          Recado da família
        </h2>
        <Button variant="ghost" size="sm" className="-my-2 -mr-2" onClick={() => setOpen(true)}>
          Ver todos
        </Button>
      </div>
      {latest ? (
        <div>
          <p className="font-sans text-base text-sn-tx wrap-break-word">{latest.body}</p>
          <p className="mt-1 font-sans text-[13px] font-semibold text-sn-mu">
            {latest.author_name ?? "Membro"},{" "}
            {formatDistanceToNow(new Date(latest.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
      ) : (
        <p className="font-sans text-base text-sn-mu">
          Nenhum recado ainda. Os recados da família aparecem aqui.
        </p>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Recados da família</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <FamilyNoteCard />
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
