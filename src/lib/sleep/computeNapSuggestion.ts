import { addMinutes, differenceInWeeks } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { getWakeWindowRange } from "@/lib/sleep/wakeWindows";
import type { AISuggestion } from "@/types";

function roundToNearest5Minutes(d: Date): Date {
  const step = 5 * 60 * 1000;
  return new Date(Math.round(d.getTime() / step) * step);
}

/**
 * Next-nap suggestion aligned with {@link getWakeWindowRange} (same table as WakeWindowBadge).
 * All clock times are formatted in `timezone` (IANA), matching the dashboard.
 */
export function computeNapSuggestion(params: {
  birthDateIso: string;
  lastSleepEndIso: string | null;
  timezone: string;
  now?: Date;
}): AISuggestion {
  const now = params.now ?? new Date();
  const tz = params.timezone;

  if (!params.lastSleepEndIso) {
    return {
      suggestedNapTime: "",
      windowStart: "",
      windowEnd: "",
      reasoning:
        "Sem um sono concluído recente, não dá para estimar a janela. Registre o fim da última soneca ou do sono noturno.",
      confidence: "low",
    };
  }

  const anchor = new Date(params.lastSleepEndIso);
  if (Number.isNaN(anchor.getTime())) {
    return {
      suggestedNapTime: "",
      windowStart: "",
      windowEnd: "",
      reasoning: "Data do último sono inválida. Verifique o registro.",
      confidence: "low",
    };
  }

  const ageWeeks = differenceInWeeks(now, new Date(params.birthDateIso));
  const range = getWakeWindowRange(ageWeeks);

  const windowStartAt = addMinutes(anchor, range.minMinutes);
  const windowEndAt = addMinutes(anchor, range.maxMinutes);
  const midpointAt = addMinutes(anchor, Math.round((range.minMinutes + range.maxMinutes) / 2));
  let midpointRounded = roundToNearest5Minutes(midpointAt);
  if (midpointRounded.getTime() < windowStartAt.getTime()) midpointRounded = windowStartAt;
  if (midpointRounded.getTime() > windowEndAt.getTime()) midpointRounded = windowEndAt;

  const windowStart = formatInTimeZone(windowStartAt, tz, "HH:mm");
  const windowEnd = formatInTimeZone(windowEndAt, tz, "HH:mm");
  const anchorClock = formatInTimeZone(anchor, tz, "HH:mm");

  let suggestedNapTime: string;
  let confidence: AISuggestion["confidence"];

  if (now.getTime() > windowEndAt.getTime()) {
    suggestedNapTime = "Assim que possível";
    confidence = "medium";
  } else if (now.getTime() > midpointRounded.getTime()) {
    suggestedNapTime = formatInTimeZone(windowEndAt, tz, "HH:mm");
    confidence = "high";
  } else {
    suggestedNapTime = formatInTimeZone(midpointRounded, tz, "HH:mm");
    confidence = "high";
  }

  const band = `${range.minMinutes}–${range.maxMinutes} min`;
  const reasoning =
    now.getTime() > windowEndAt.getTime()
      ? `Último sono terminou às ${anchorClock}. Para ${range.label} (${band}), a janela do Soninho era ${windowStart}–${windowEnd}. Esse intervalo já passou — priorize colocar o bebê para dormir agora.`
      : now.getTime() > midpointRounded.getTime()
        ? `Último sono terminou às ${anchorClock}. Para ${range.label} (${band}), a janela do Soninho é ${windowStart}–${windowEnd}. Você está na parte final da janela; ideal até ${suggestedNapTime}.`
        : `Último sono terminou às ${anchorClock}. Para ${range.label} (${band}), a janela do Soninho é ${windowStart}–${windowEnd}. Sugestão de horário alinhada ao centro dessa faixa.`;

  return {
    suggestedNapTime,
    windowStart,
    windowEnd,
    reasoning,
    confidence,
  };
}
