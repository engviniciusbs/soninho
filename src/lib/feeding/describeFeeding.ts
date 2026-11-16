import { formatDuration } from "@/lib/utils";
import type {
  BottleFeeding,
  BreastfeedingSession,
  FeedingTimelineItem,
  FeedingType,
  SolidFeeding,
} from "@/types";

export const FEEDING_LABEL: Record<FeedingType, string> = {
  BOTTLE: "Mamadeira",
  BREAST: "Peito",
  SOLID: "Sólidos",
};

/** Shown instead of a duration while a feeding at the breast has no end. */
export const RUNNING = "Em andamento";

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

export interface FeedingDescription {
  label: string;
  /** The sides (breast) or the foods (solids); `null` when there is nothing to add. */
  detail: string | null;
  /** "120 ml", "18 min" or "Em andamento"; none for solids. */
  value?: string;
  /** A feeding at the breast still running (no end time): it is not edited from a list. */
  running: boolean;
}

/** One description of a feeding, shared by the home's "Hoje" and Comida's lists. */
export function describeFeeding(item: FeedingTimelineItem): FeedingDescription {
  const label = FEEDING_LABEL[item.type];
  if (item.type === "BOTTLE") {
    return { label, detail: null, value: `${(item.raw as BottleFeeding).volume_ml} ml`, running: false };
  }
  if (item.type === "BREAST") {
    const raw = item.raw as BreastfeedingSession;
    const running = !item.endTime;
    return {
      label,
      detail: sidesText(raw),
      value: running ? RUNNING : formatDuration((raw.side_left_sec + raw.side_right_sec) / 60),
      running,
    };
  }
  const foods = joinPt((item.raw as SolidFeeding).food_tags ?? []);
  return { label, detail: foods || null, running: false };
}
