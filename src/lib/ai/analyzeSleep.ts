import { differenceInWeeks, differenceInMonths, format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import type { Baby, SleepSession } from "@/types";

export function buildSleepContext(baby: Baby, sessions: SleepSession[]): string {
  const birth = new Date(baby.birth_date);
  const now = new Date();
  const ageWeeks = differenceInWeeks(now, birth);
  const ageMonths = differenceInMonths(now, birth);

  const last7days = sessions.filter(
    (s) => new Date(s.start_time) >= subDays(startOfDay(now), 7)
  );

  const completed = last7days.filter((s) => s.duration_min != null);
  const naps = completed.filter((s) => s.type === "NAP");
  const nightSessions = completed.filter((s) => s.type === "NIGHT_SLEEP");

  const days = eachDayOfInterval({
    start: subDays(startOfDay(now), 6),
    end: now,
  });

  const dailySummaries = days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const daySessions = completed.filter(
      (s) => format(new Date(s.start_time), "yyyy-MM-dd") === dayStr
    );
    const totalMin = daySessions.reduce((a, s) => a + (s.duration_min ?? 0), 0);
    const dayNaps = daySessions.filter((s) => s.type === "NAP");

    return `  ${format(day, "dd/MM")}: ${(totalMin / 60).toFixed(1)}h total, ${dayNaps.length} sonecas`;
  });

  const avgNapDur =
    naps.length > 0
      ? (naps.reduce((a, s) => a + (s.duration_min ?? 0), 0) / naps.length).toFixed(0)
      : "N/A";

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
    const endHour = new Date(s.end_time).getHours();
    return endHour < 6;
  });
  if (earlyWakes.length > 2) {
    patterns.push("- Acordando antes das 6h frequentemente");
  }

  return `
Nome do bebê: ${baby.name}
Idade: ${ageWeeks} semanas (${ageMonths} meses)
Data de nascimento: ${format(birth, "dd/MM/yyyy")}

=== RESUMO DOS ÚLTIMOS 7 DIAS ===
${dailySummaries.join("\n")}

Total de sonecas (7 dias): ${naps.length}
Duração média das sonecas: ${avgNapDur} minutos
Total de sessões noturnas: ${nightSessions.length}
Janelas de vigília recentes: ${wakeWindows.slice(-6).join(", ") || "Sem dados suficientes"}

${patterns.length > 0 ? `=== PADRÕES IDENTIFICADOS ===\n${patterns.join("\n")}` : ""}

Horário atual: ${format(now, "HH:mm dd/MM/yyyy")}
`.trim();
}
