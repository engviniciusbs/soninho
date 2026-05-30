"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquareText, Send, Trash2, Loader2 } from "lucide-react";
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
    return <Skeleton className="h-28 rounded-2xl" />;
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="rounded-2xl surface p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <MessageSquareText className="h-4 w-4 text-foreground/70" aria-hidden="true" />
        </div>
        <h2 className="text-sm font-semibold">Mural da família</h2>
      </div>

      {canWrite && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder="Deixe um recado para a equipe…"
            className="flex-1 rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Novo recado"
          />
          <button
            type="submit"
            disabled={!text.trim() || addNote.isPending}
            aria-label="Enviar recado"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {addNote.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </form>
      )}

      {data.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum recado ainda. Use o mural para combinar a rotina entre os
          cuidadores.
        </p>
      ) : (
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {data.data.map((note) => {
              const mine = note.author_id === data.currentUserId;
              return (
                <motion.li
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="group flex items-start gap-2.5"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-foreground/70">
                    {initials(note.author_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground/80 truncate">
                        {note.author_name ?? "Membro"}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(note.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 wrap-break-word">
                      {note.body}
                    </p>
                  </div>
                  {mine && (
                    <button
                      type="button"
                      onClick={() => removeNote.mutate(note.id)}
                      aria-label="Remover recado"
                      className="shrink-0 rounded-lg p-1 text-muted-foreground opacity-100 transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </motion.div>
  );
}
