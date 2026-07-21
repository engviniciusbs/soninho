"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Milk, Baby, Salad, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  deleteBottleFeeding,
  deleteBreastfeedingSession,
  deleteSolidFeeding,
} from "@/lib/supabase/feedingQueries";
import { useFeedingTimeline } from "@/hooks/useFeedingTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FeedingTimelineItem, FeedingType } from "@/types";

const TYPE_CONFIG: Record<
  FeedingType,
  { icon: typeof Milk; iconClass: string; bgClass: string; label: string }
> = {
  BOTTLE: { icon: Milk, iconClass: "text-sky-400", bgClass: "bg-sky-500/15", label: "Mamadeira" },
  BREAST: { icon: Baby, iconClass: "text-rose-400", bgClass: "bg-rose-500/15", label: "Peito" },
  SOLID: { icon: Salad, iconClass: "text-emerald-400", bgClass: "bg-emerald-500/15", label: "Sólidos" },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

async function deleteItem(supabase: ReturnType<typeof createClient>, item: FeedingTimelineItem) {
  if (item.type === "BOTTLE") return deleteBottleFeeding(supabase, item.id);
  if (item.type === "BREAST") return deleteBreastfeedingSession(supabase, item.id);
  return deleteSolidFeeding(supabase, item.id);
}

interface FeedingTimelineProps {
  onEdit?: (item: FeedingTimelineItem) => void;
}

export function FeedingTimeline({ onEdit }: FeedingTimelineProps = {}) {
  const { data: items = [], isLoading } = useFeedingTimeline(3);
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(item: FeedingTimelineItem) {
    setDeletingId(item.id);
    const { error } = await deleteItem(supabase, item);
    setDeletingId(null);
    if (error) {
      toast.error("Erro ao excluir registro");
      return;
    }
    toast.success("Registro excluído");
    queryClient.invalidateQueries({ queryKey: ["feeding-timeline"] });
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhuma alimentação registrada ainda. Comece registrando acima.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {items.map((item) => {
          const { icon: Icon, iconClass, bgClass, label } = TYPE_CONFIG[item.type];
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -16 }}
              layout
              className="group flex items-center gap-3 rounded-2xl surface py-3 px-4"
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", bgClass)}>
                <Icon className={cn("h-5 w-5", iconClass)} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{label}</span>
                  {!item.endTime && item.type === "BREAST" && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                      Em andamento
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatTime(item.startTime)} · {item.summary}
                </p>
              </div>
              <div className="flex gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => onEdit(item)}
                    aria-label="Editar registro"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  aria-label="Excluir registro"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
