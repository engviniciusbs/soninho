"use client";

import { useCallback, useId } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, isSameDay, subDays } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  deleteBottleFeeding,
  deleteBreastfeedingSession,
  deleteSolidFeeding,
} from "@/lib/supabase/feedingQueries";
import { useFeedingTimeline } from "@/hooks/useFeedingTimeline";
import { useNow } from "@/hooks/useNow";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinutes } from "@/components/home/format";
import type {
  BottleFeeding,
  BreastfeedingSession,
  FeedingTimelineItem,
  FeedingType,
  SolidFeeding,
} from "@/types";

const LABEL: Record<FeedingType, string> = {
  BOTTLE: "Mamadeira",
  BREAST: "Peito",
  SOLID: "Sólidos",
};

/** "Banana", "Banana e Maçã", "Banana, Maçã e Pera". */
function joinPt(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

function sidesText(raw: BreastfeedingSession): string | null {
  const left = raw.side_left_sec > 0;
  const right = raw.side_right_sec > 0;
  if (left && right) return "esquerdo e direito";
  if (left) return "esquerdo";
  if (right) return "direito";
  return null;
}

/** Subtitle and right-hand value of one row (mockup `.list .item`). */
function describe(item: FeedingTimelineItem, at: string): { subtitle: string; value?: string } {
  if (item.type === "BOTTLE") {
    return { subtitle: at, value: `${(item.raw as BottleFeeding).volume_ml} ml` };
  }
  if (item.type === "BREAST") {
    const raw = item.raw as BreastfeedingSession;
    const sides = sidesText(raw);
    return {
      subtitle: sides ? `${at}, ${sides}` : at,
      value: item.endTime
        ? formatMinutes((raw.side_left_sec + raw.side_right_sec) / 60)
        : "Em andamento",
    };
  }
  const foods = joinPt((item.raw as SolidFeeding).food_tags ?? []);
  return { subtitle: foods ? `${at}, ${foods}` : at };
}

function bottleTotal(items: FeedingTimelineItem[]): number {
  return items
    .filter((i) => i.type === "BOTTLE")
    .reduce((sum, i) => sum + Number((i.raw as BottleFeeding).volume_ml || 0), 0);
}

function headline(items: FeedingTimelineItem[]): string | null {
  const ml = bottleTotal(items);
  if (ml > 0) return `${ml} ml no total`;
  const feeds = items.filter((i) => i.type !== "SOLID").length;
  if (feeds > 0) return feeds === 1 ? "1 mamada" : `${feeds} mamadas`;
  return null;
}

async function deleteItem(supabase: ReturnType<typeof createClient>, item: FeedingTimelineItem) {
  if (item.type === "BOTTLE") return deleteBottleFeeding(supabase, item.id);
  if (item.type === "BREAST") return deleteBreastfeedingSession(supabase, item.id);
  return deleteSolidFeeding(supabase, item.id);
}

/** Deletes a feeding entry (same calls and messages as the old trash button). */
export function useDeleteFeeding() {
  const queryClient = useQueryClient();
  return useCallback(
    async (item: FeedingTimelineItem): Promise<boolean> => {
      const { error } = await deleteItem(createClient(), item);
      if (error) {
        toast.error("Erro ao excluir registro");
        return false;
      }
      toast.success("Registro excluído");
      queryClient.invalidateQueries({ queryKey: ["feeding-timeline"] });
      return true;
    },
    [queryClient]
  );
}

interface FeedingTimelineProps {
  onEdit?: (item: FeedingTimelineItem) => void;
}

function Rows({
  items,
  onEdit,
  when,
}: {
  items: FeedingTimelineItem[];
  onEdit?: (item: FeedingTimelineItem) => void;
  when: (iso: string) => string;
}) {
  return (
    <ul className="-my-1">
      {items.map((item) => {
        const { subtitle, value } = describe(item, when(item.startTime));
        return (
          <li key={`${item.type}-${item.id}`}>
            <ListRow
              title={LABEL[item.type]}
              subtitle={subtitle}
              value={value}
              onClick={onEdit ? () => onEdit(item) : undefined}
            />
          </li>
        );
      })}
    </ul>
  );
}

/**
 * "Hoje" (mockup `.list`): today's entries with the day's bottle total; the
 * other days the list already loads follow below. Tapping an entry edits it.
 */
export function FeedingTimeline({ onEdit }: FeedingTimelineProps = {}) {
  const todayId = useId();
  const earlierId = useId();
  const { data: items = [], isLoading } = useFeedingTimeline(3);
  const now = useNow(60_000);

  if (isLoading || now === null) {
    return (
      <Card aria-busy="true" aria-label="Carregando registros de hoje" className="gap-3 px-[18px]">
        <Skeleton className="h-6 w-24 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </Card>
    );
  }

  const today = items.filter((i) => isSameDay(new Date(i.startTime), now));
  const earlier = items.filter((i) => !isSameDay(new Date(i.startTime), now));
  const total = headline(today);

  return (
    <>
      <Card role="region" aria-labelledby={todayId} className="gap-0 px-[18px]">
        <div className="mb-2 flex items-center justify-between border-b border-sn-bd pb-3">
          <h2 id={todayId} className="font-sans text-lg font-bold text-sn-tx">
            Hoje
          </h2>
          {total && <span className="font-sans text-sm font-bold text-sn-pr tabular-nums">{total}</span>}
        </div>
        {today.length === 0 ? (
          <p className="py-2 font-sans text-[15px] font-semibold text-sn-mu">
            Nada registrado hoje. Use o registro acima, ou registre uma mamada passada.
          </p>
        ) : (
          <Rows items={today} onEdit={onEdit} when={(iso) => format(new Date(iso), "HH:mm")} />
        )}
      </Card>

      {earlier.length > 0 && (
        <Card role="region" aria-labelledby={earlierId} className="gap-0 px-[18px]">
          <div className="mb-2 border-b border-sn-bd pb-3">
            <h2 id={earlierId} className="font-sans text-lg font-bold text-sn-tx">
              Dias anteriores
            </h2>
          </div>
          <Rows
            items={earlier}
            onEdit={onEdit}
            when={(iso) => {
              const d = new Date(iso);
              return `${isSameDay(d, subDays(now, 1)) ? "Ontem" : format(d, "dd/MM")}, ${format(d, "HH:mm")}`;
            }}
          />
        </Card>
      )}
    </>
  );
}
