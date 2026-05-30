import { addMinutes, differenceInWeeks, parse } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { getWakeWindowRange } from "@/lib/sleep/wakeWindows";
import { inferNextSleepKind } from "@/lib/sleep/inferNextSleepKind";
import type { AISuggestion, SleepSession, SleepType } from "@/types";

function roundToNearest5Minutes(d: Date): Date {
  const step = 5 * 60 * 1000;
  return new Date(Math.round(d.getTime() / step) * step);
}

function clockHour(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return h + (m ?? 0) / 60;
}

function minutesUntilClock(
  clock: string,
  tz: string,
  now: Date
): number {
  const dayStr = formatInTimeZone(now, tz, "yyyy-MM-dd");
  const target = fromZonedTime(
    parse(`${dayStr} ${clock}`, "yyyy-MM-dd HH:mm", new Date()),
    tz
  );
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 60000));
}

function buildReasoning(params: {
  kind: SleepType;
  lastSessionType: SleepType | null;
  anchorClock: string;
  rangeLabel: string;
  band: string;
  windowStart: string;
  windowEnd: string;
  suggestedTime: string;
  overdue: boolean;
  inLateWindow: boolean;
}): string {
  const {
    kind,
    lastSessionType,
    anchorClock,
    rangeLabel,
    band,
    windowStart,
    windowEnd,
    suggestedTime,
    overdue,
    inLateWindow,
  } = params;

  const lastWasNap = lastSessionType !== "NIGHT_SLEEP";

  if (kind === "NIGHT_SLEEP") {
    if (overdue) {
      return lastWasNap
        ? `Última soneca terminou às ${anchorClock}. Para ${rangeLabel} (${band}), a janela para iniciar o sono noturno era ${windowStart}–${windowEnd}. Esse horário passou — hora de colocar o bebê para dormir.`
        : `Último despertar foi às ${anchorClock}. A janela sugerida para o sono noturno era ${windowStart}–${windowEnd} e já passou — priorize a rotina de dormir agora.`;
    }
    if (inLateWindow) {
      return lastWasNap
        ? `Última soneca terminou às ${anchorClock}. Após a soneca da tarde, o próximo sono costuma ser o noturno. Janela sugerida: ${windowStart}–${windowEnd}; ideal até ${suggestedTime}.`
        : `Com base no último despertar (${anchorClock}), a janela para o sono noturno é ${windowStart}–${windowEnd}. Ideal iniciar até ${suggestedTime}.`;
    }
    return lastWasNap
      ? `Última soneca terminou às ${anchorClock}. Para ${rangeLabel}, após a última soneca do dia a rotina aponta para o sono noturno — janela ${windowStart}–${windowEnd}, sugerido por volta de ${suggestedTime}.`
      : `Último despertar às ${anchorClock}. Janela sugerida para o sono noturno: ${windowStart}–${windowEnd}, alinhada ao padrão de ${rangeLabel} (${band}).`;
  }

  if (overdue) {
    return `Último sono terminou às ${anchorClock}. Para ${rangeLabel} (${band}), a janela do Soninho era ${windowStart}–${windowEnd}. Esse intervalo já passou — priorize colocar o bebê para dormir agora.`;
  }
  if (inLateWindow) {
    return `Último sono terminou às ${anchorClock}. Para ${rangeLabel} (${band}), a janela do Soninho é ${windowStart}–${windowEnd}. Você está na parte final da janela; ideal até ${suggestedTime}.`;
  }
  return `Último sono terminou às ${anchorClock}. Para ${rangeLabel} (${band}), a janela do Soninho é ${windowStart}–${windowEnd}. Sugestão de horário alinhada ao centro dessa faixa.`;
}

/**
 * Next-sleep suggestion aligned with {@link getWakeWindowRange} (same table as WakeWindowBadge).
 * Infers nap vs. night sleep from schedule, time of day, and recent history.
 */
export function computeNapSuggestion(params: {
  birthDateIso: string;
  lastSleepEndIso: string | null;
  lastSessionType?: SleepType | null;
  recentSessions?: SleepSession[];
  timezone: string;
  now?: Date;
}): AISuggestion {
  const now = params.now ?? new Date();
  const tz = params.timezone;
  const recentSessions = params.recentSessions ?? [];

  if (!params.lastSleepEndIso) {
    return {
      kind: "NAP",
      suggestedNapTime: "",
      windowStart: "",
      windowEnd: "",
      reasoning:
        "Sem um sono concluído recente, não dá para estimar a janela. Registre o fim da última soneca ou do sono noturno.",
      confidence: "low",
      minutesUntilSuggested: 0,
    };
  }

  const anchor = new Date(params.lastSleepEndIso);
  if (Number.isNaN(anchor.getTime())) {
    return {
      kind: "NAP",
      suggestedNapTime: "",
      windowStart: "",
      windowEnd: "",
      reasoning: "Data do último sono inválida. Verifique o registro.",
      confidence: "low",
      minutesUntilSuggested: 0,
    };
  }

  const ageWeeks = differenceInWeeks(now, new Date(params.birthDateIso));
  const range = getWakeWindowRange(ageWeeks);

  const windowStartAt = addMinutes(anchor, range.minMinutes);
  const windowEndAt = addMinutes(anchor, range.maxMinutes);
  const midpointAt = addMinutes(
    anchor,
    Math.round((range.minMinutes + range.maxMinutes) / 2)
  );
  let midpointRounded = roundToNearest5Minutes(midpointAt);
  if (midpointRounded.getTime() < windowStartAt.getTime()) {
    midpointRounded = windowStartAt;
  }
  if (midpointRounded.getTime() > windowEndAt.getTime()) {
    midpointRounded = windowEndAt;
  }

  const windowStart = formatInTimeZone(windowStartAt, tz, "HH:mm");
  const windowEnd = formatInTimeZone(windowEndAt, tz, "HH:mm");
  const anchorClock = formatInTimeZone(anchor, tz, "HH:mm");

  const kind = inferNextSleepKind({
    lastSessionType: params.lastSessionType ?? null,
    lastSleepEndIso: params.lastSleepEndIso,
    recentSessions,
    ageWeeks,
    timezone: tz,
    windowStartHour: clockHour(windowStart),
    windowEndHour: clockHour(windowEnd),
    now,
  });

  let suggestedNapTime: string;
  let confidence: AISuggestion["confidence"];
  const overdue = now.getTime() > windowEndAt.getTime();
  const inLateWindow = !overdue && now.getTime() > midpointRounded.getTime();

  if (overdue) {
    suggestedNapTime = "Assim que possível";
    confidence = "medium";
  } else if (inLateWindow) {
    suggestedNapTime = formatInTimeZone(windowEndAt, tz, "HH:mm");
    confidence = "high";
  } else {
    suggestedNapTime = formatInTimeZone(midpointRounded, tz, "HH:mm");
    confidence = "high";
  }

  const band = `${range.minMinutes}–${range.maxMinutes} min`;
  const reasoning = buildReasoning({
    kind,
    lastSessionType: params.lastSessionType ?? null,
    anchorClock,
    rangeLabel: range.label,
    band,
    windowStart,
    windowEnd,
    suggestedTime: suggestedNapTime,
    overdue,
    inLateWindow,
  });

  const minutesUntilSuggested =
    suggestedNapTime === "Assim que possível"
      ? 0
      : minutesUntilClock(suggestedNapTime, tz, now);

  return {
    kind,
    suggestedNapTime,
    windowStart,
    windowEnd,
    reasoning,
    confidence,
    minutesUntilSuggested,
  };
}
