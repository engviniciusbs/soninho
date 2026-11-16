"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { IconSend, IconTrash } from "@/components/brand/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBaby } from "@/components/providers/BabyProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { FamilyNote } from "@/types";

interface NotesResponse {
  data: FamilyNote[];
  memberCount: number;
  currentUserRole: "owner" | "caregiver" | "viewer";
  currentUserId: string;
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function FamilyNoteCard() {
  const { activeBaby } = useBaby();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const queryKey = ["family-notes", activeBaby?.id];

  const { data, isLoading } = useQuery<NotesResponse | null>({
    queryKey,
    queryFn: async () => {
      if (!activeBaby) return null;
      const res = await fetch(`/api/family/notes?babyId=${activeBaby.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!activeBaby,
    staleTime: 30 * 1000,
  });

  const addNote = useMutation({
    mutationFn: async (body: string) => {
      if (!activeBaby) throw new Error("no baby");
      const res = await fetch("/api/family/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ babyId: activeBaby.id, text: body }),
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error("Não foi possível enviar o recado"),
  });

  const removeNote = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/family/notes?noteId=${noteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Não foi possível remover o recado"),
  });

  if (isLoading) {
    return <Skeleton className="h-36 rounded-[24px]" />;
  }

  // Only relevant for shared families (more than one member).
  if (!data || data.memberCount <= 1) return null;

  const canWrite = data.currentUserRole !== "viewer";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || addNote.isPending) return;
    addNote.mutate(text);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mural da família</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canWrite && (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder="Deixe um recado para a equipe…"
              className="h-11 min-w-0 flex-1 rounded-full border border-sn-mu/70 bg-sn-s2/60 px-4 font-sans text-base text-sn-tx outline-none placeholder:text-sn-mu focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr"
              aria-label="Novo recado"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!text.trim()}
              loading={addNote.isPending}
              aria-label="Enviar recado"
            >
              {!addNote.isPending && <IconSend size={20} />}
            </Button>
          </form>
        )}

        {data.data.length === 0 ? (
          <p className="text-base text-sn-mu">
            Nenhum recado ainda. Use o mural para combinar a rotina entre os
            cuidadores.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.data.map((note) => {
              const mine = note.author_id === data.currentUserId;
              return (
                <li key={note.id} className="flex items-start gap-3">
                  <div
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-sn-s2 text-sm font-bold text-sn-pr"
                  >
                    {initials(note.author_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-bold text-sn-tx">
                        {note.author_name ?? "Membro"}
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold text-sn-mu">
                        {formatDistanceToNow(new Date(note.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <p className="text-base text-sn-tx wrap-break-word">{note.body}</p>
                  </div>
                  {mine && (
                    <Button
                      variant="icon"
                      size="icon"
                      onClick={() => removeNote.mutate(note.id)}
                      aria-label="Remover recado"
                      className="-my-1.5 shrink-0 text-sn-mu hover:text-sn-danger"
                    >
                      <IconTrash size={20} />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
