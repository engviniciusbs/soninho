"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Activity, Moon, Sun, Milk, Baby as BabyIcon, Salad } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getFamilyRelationLabel } from "@/lib/family/relations";
import { useBaby } from "@/components/providers/BabyProvider";
import type { UnifiedActivityItem } from "@/app/api/family/activity/route";

const FEEDING_LABELS: Record<string, string> = {
  BOTTLE: "mamadeira",
  BREAST: "mamada no peito",
  SOLID: "refeição de sólidos",
};

function activityLine(entry: UnifiedActivityItem): string {
  const who =
    getFamilyRelationLabel(entry.actor_relation) ??
    entry.actor_name ??
    "Alguém";

  if (entry.kind === "feeding") {
    const label = FEEDING_LABELS[entry.feeding_type ?? "BOTTLE"];
    if (entry.action === "started") return `${who} iniciou ${label}`;
    if (entry.action === "stopped") return `${who} finalizou ${label}`;
    return `${who} registrou ${label}`;
  }

  const kind = entry.sleep_type === "NIGHT_SLEEP" ? "sono noturno" : "soneca";
  if (entry.action === "started") return `${who} iniciou ${kind}`;
  return `${who} finalizou ${kind}`;
}

function ActivityIcon({ entry }: { entry: UnifiedActivityItem }) {
  if (entry.kind === "feeding") {
    if (entry.feeding_type === "BREAST") return <BabyIcon className="h-4 w-4 text-rose-400" />;
    if (entry.feeding_type === "SOLID") return <Salad className="h-4 w-4 text-emerald-400" />;
    return <Milk className="h-4 w-4 text-sky-400" />;
  }
  return entry.sleep_type === "NIGHT_SLEEP" ? (
    <Moon className="h-4 w-4 text-indigo-400" />
  ) : (
    <Sun className="h-4 w-4 text-amber-400" />
  );
}

export function FamilyActivityFeed() {
  const { activeBaby } = useBaby();
  const babyId = activeBaby?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["family-activity-feed", babyId],
    queryFn: async () => {
      const membersRes = await fetch(`/api/family/members?babyId=${babyId}`);
      const membersJson = membersRes.ok ? await membersRes.json() : { data: [] };
      const memberCount = (membersJson.data as unknown[])?.length ?? 1;
      if (memberCount < 2) {
        return { memberCount, items: [] as UnifiedActivityItem[] };
      }
      const res = await fetch(`/api/family/activity?babyId=${babyId}&limit=8`);
      const activityJson = res.ok ? await res.json() : { data: [] };
      return {
        memberCount,
        items: (activityJson.data ?? []) as UnifiedActivityItem[],
      };
    },
    enabled: !!babyId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const memberCount = data?.memberCount ?? 1;
  const items = data?.items ?? [];
  const loading = isLoading;

  if (!babyId || memberCount < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" aria-hidden />
          Atividade da família
        </CardTitle>
        <CardDescription>Quem registrou sono ou alimentação recentemente</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda sem registros — quando alguém iniciar uma soneca ou registrar uma mamada, aparece aqui.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-sm"
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background"
                  aria-hidden
                >
                  <ActivityIcon entry={entry} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{activityLine(entry)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(entry.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
