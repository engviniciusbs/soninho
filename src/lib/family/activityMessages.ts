import { getFamilyRelationLabel } from "@/lib/family/relations";
import type { SleepType, FeedingType } from "@/types";

export function formatSleepActivityMessage(
  action: "started" | "stopped",
  actorRelation: string | null,
  actorName: string | null,
  sleepType: SleepType | null,
  babyName: string
): string {
  const who =
    getFamilyRelationLabel(actorRelation) ??
    actorName?.trim() ??
    "Alguém";
  const sleepLabel =
    sleepType === "NIGHT_SLEEP" ? "sono noturno" : "soneca";

  if (action === "started") {
    return `${who} iniciou ${sleepLabel} de ${babyName}`;
  }
  return `${who} finalizou ${sleepLabel} de ${babyName}`;
}

const FEEDING_LABELS: Record<FeedingType, string> = {
  BOTTLE: "mamadeira",
  BREAST: "mamada no peito",
  SOLID: "refeição de sólidos",
};

export function formatFeedingActivityMessage(
  action: "started" | "stopped" | "logged",
  actorRelation: string | null,
  actorName: string | null,
  feedingType: FeedingType,
  babyName: string
): string {
  const who =
    getFamilyRelationLabel(actorRelation) ??
    actorName?.trim() ??
    "Alguém";
  const label = FEEDING_LABELS[feedingType];

  if (action === "started") return `${who} iniciou ${label} de ${babyName}`;
  if (action === "stopped") return `${who} finalizou ${label} de ${babyName}`;
  return `${who} registrou ${label} de ${babyName}`;
}
