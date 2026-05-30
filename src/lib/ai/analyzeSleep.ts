import {
  differenceInWeeks,
  differenceInMonths,
  subDays,
  eachDayOfInterval,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import type { Baby, SleepSession } from "@/types";

/**
 * Builds a human-readable sleep context string for the AI prompt.
 *
 * All date/time values are formatted in the user's local timezone (passed from
 * the browser), so the AI always sees the correct local times regardless of
 * whether the server runs in UTC (Vercel) or any other timezone.
 */
export function buildSleepContext(
  baby: Baby,
  sessions: SleepSession[],
  timezone: string = "America/Sao_Paulo",
  feedbackSummary?: string | null
): string {
  const birth = new Date(baby.birth_date);
  // "now" in the user's local timezone
  const nowUtc = new Date();
  const nowLocal = toZonedTime(nowUtc, timezone);

  const ageWeeks = differenceInWeeks(nowLocal, birth);
  const ageMonths = differenceInMonths(nowLocal, birth);

  // Compute "7 days ago" in the user's timezone to avoid off-by-one at midnight
  const sevenDaysAgo = subDays(nowLocal, 7);

  const last7days = sessions.filter(
    (s) => toZonedTime(new Date(s.start_time), timezone) >= sevenDaysAgo
  );

  const completed = last7days.filter((s) => s.duration_min != null);
  const naps = completed.filter((s) => s.type === "NAP");
  const nightSessions = completed.filter((s) => s.type === "NIGHT_SLEEP");

  // Daily summaries — all dates in user's timezone
  const days = eachDayOfInterval({ start: subDays(nowLocal, 6), end: nowLocal });

  const dailySummaries = days.map((day) => {
    const dayStr = formatInTimeZone(day, timezone, "yyyy-MM-dd");
    const daySessions = completed.filter(
      (s) => formatInTimeZone(new Date(s.start_time), timezone, "yyyy-MM-dd") === dayStr
    );
    const totalMin = daySessions.reduce((a, s) => a + (s.duration_min ?? 0), 0);
    const dayNaps = daySessions.filter((s) => s.type === "NAP");
    return `  ${formatInTimeZone(day, timezone, "dd/MM")}: ${(totalMin / 60).toFixed(1)}h total, ${dayNaps.length} sonecas`;
  });

  const avgNapDur =
    naps.length > 0
      ? (naps.reduce((a, s) => a + (s.duration_min ?? 0), 0) / naps.length).toFixed(0)
      : "N/A";

  // Wake windows — computed from raw timestamps (timezone-agnostic gap in ms)
  const wakeWindows: string[] = [];
  const sortedCompleted = [...completed].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  for (let i = 1; i < sortedCompleted.length; i++) {
    const prevEnd = sortedCompleted[i - 1].end_time;
    const currStart = sortedCompleted[i].start_time;
    if (prevEnd) {
      const gap = (new Date(currStart).getTime() - new Date(prevEnd).getTime()) / 60000;
      if (gap > 0 && gap < 600) {
        wakeWindows.push(`${Math.round(gap)}min`);
      }
    }
  }

  const patterns: string[] = [];
  const shortNaps = naps.filter((s) => (s.duration_min ?? 0) < 30);
  if (shortNaps.length > naps.length * 0.5 && naps.length > 2) {
    patterns.push("- Sonecas predominantemente curtas (< 30min)");
  }
  const earlyWakes = nightSessions.filter((s) => {
    if (!s.end_time) return false;
    // Check the local hour of wake-up
    const endHour = parseInt(formatInTimeZone(new Date(s.end_time), timezone, "H"), 10);
    return endHour < 6;
  });
  if (earlyWakes.length > 2) {
    patterns.push("- Acordando antes das 6h frequentemente");
  }

  // ── Anchor: last completed session ──────────────────────────────────────
  // Format end_time in the user's timezone so the AI calculates with the
  // correct local time, not UTC (which would be 3h off for Brazil).
  const lastCompleted = sortedCompleted[sortedCompleted.length - 1];
  const lastSleepEndTime = lastCompleted?.end_time
    ? formatInTimeZone(new Date(lastCompleted.end_time), timezone, "HH:mm 'de' dd/MM/yyyy")
    : "Sem registro";
  const lastSleepType =
    lastCompleted?.type === "NAP"
      ? "soneca"
      : lastCompleted?.type === "NIGHT_SLEEP"
        ? "sono noturno"
        : "N/A";
  const lastSleepDuration = lastCompleted?.duration_min
    ? `${lastCompleted.duration_min} min`
    : "N/A";

  const currentTime = formatInTimeZone(nowUtc, timezone, "HH:mm");

  // ── Environmental context from recent sessions ─────────────────────────────
  const recentWithEnv = [...completed]
    .reverse()
    .slice(0, 5)
    .filter((s) => s.room_temp_celsius != null || s.weather_condition || s.sleep_sack_type);

  const envLines: string[] = recentWithEnv.map((s) => {
    const parts: string[] = [];
    if (s.room_temp_celsius != null) parts.push(`${s.room_temp_celsius}°C`);
    if (s.weather_condition) parts.push(s.weather_condition);
    if (s.sleep_sack_type && s.sleep_sack_type !== "none") {
      const sackLabel = s.sleep_sack_type;
      const togStr = s.sleep_sack_tog != null ? ` TOG ${s.sleep_sack_tog}` : "";
      parts.push(`saquinho ${sackLabel}${togStr}`);
    }
    const sessionTime = formatInTimeZone(new Date(s.start_time), timezone, "dd/MM HH:mm");
    const quality = s.quality != null ? ` (qualidade: ${s.quality}/5)` : "";
    return `  ${sessionTime} — ${parts.join(", ")}${quality}`;
  });

  // Last session's environment (most relevant for clothing suggestion)
  const lastEnv = lastCompleted
    ? [
        lastCompleted.room_temp_celsius != null ? `Temperatura do quarto: ${lastCompleted.room_temp_celsius}°C` : null,
        lastCompleted.weather_condition ? `Clima: ${lastCompleted.weather_condition}` : null,
        lastCompleted.sleep_sack_type && lastCompleted.sleep_sack_type !== "none"
          ? `Saquinho: ${lastCompleted.sleep_sack_type}${lastCompleted.sleep_sack_tog != null ? ` TOG ${lastCompleted.sleep_sack_tog}` : ""}`
          : null,
      ].filter(Boolean)
    : [];

  return `
Nome do bebê: ${baby.name}
Idade: ${ageWeeks} semanas (${ageMonths} meses)
Data de nascimento: ${formatInTimeZone(birth, timezone, "dd/MM/yyyy")}
Horário de referência (agora): ${currentTime} (fuso: ${timezone})

=== ÚLTIMO SONO REGISTRADO (ÂNCORA PARA CÁLCULO) ===
Tipo: ${lastSleepType}
Fim do sono: ${lastSleepEndTime}
Duração: ${lastSleepDuration}
${lastEnv.length > 0 ? lastEnv.join("\n") : "Sem dados de ambiente registrados"}

=== RESUMO DOS ÚLTIMOS 7 DIAS ===
${dailySummaries.join("\n")}

Total de sonecas (7 dias): ${naps.length}
Duração média das sonecas: ${avgNapDur} minutos
Total de sessões noturnas: ${nightSessions.length}
Janelas de vigília recentes: ${wakeWindows.slice(-6).join(", ") || "Sem dados suficientes"}

${envLines.length > 0 ? `=== CONDIÇÕES AMBIENTAIS RECENTES ===\n${envLines.join("\n")}` : ""}

${patterns.length > 0 ? `=== PADRÕES IDENTIFICADOS ===\n${patterns.join("\n")}` : ""}

${feedbackSummary ? `=== FEEDBACK DOS PAIS SOBRE SUGESTÕES ===\n${feedbackSummary}` : ""}
`.trim();
}
