import { getFamilyRelationLabel } from "@/lib/family/relations";
import type { SleepType } from "@/types";

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
