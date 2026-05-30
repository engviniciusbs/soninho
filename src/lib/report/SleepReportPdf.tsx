import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { differenceInWeeks, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { SleepSession } from "@/types";
import {
  getDailyTotals,
  getNapCountPerDay,
  getLongestNightStretch,
} from "@/lib/sleep/statistics";
import { computeEnvironmentCorrelation } from "@/lib/sleep/environmentCorrelation";
import { getAgeSchedule } from "@/lib/sleep/schedules";

export interface SleepReportData {
  babyName: string;
  birthDate: string;
  ageLabel: string;
  periodDays: number;
  periodLabel: string;
  generatedAt: string;
  avgTotalHours: number;
  targetTotalHours: number;
  adherencePct: number;
  avgNapHours: number;
  napCountAvg: number;
  napCountTarget: string;
  longestNightHours: number;
  targetNightHours: number;
  totalSessions: number;
  daily: { date: string; totalHours: number; napHours: number; nightHours: number }[];
  bestEnvironment: string | null;
  envWeather: { label: string; count: number; avgQuality: number | null }[];
}

/** Computes the report dataset from raw sessions. Pure, runs client-side. */
export function buildSleepReportData(
  sessions: SleepSession[],
  baby: { name: string; birth_date: string },
  periodDays: number
): SleepReportData {
  const ageWeeks = differenceInWeeks(new Date(), parseISO(baby.birth_date));
  const schedule = getAgeSchedule(ageWeeks);

  const daily = getDailyTotals(sessions, periodDays);
  const daysWithData = daily.filter((d) => d.totalHours > 0);
  const denom = daysWithData.length || 1;

  const avgTotalHours = daysWithData.reduce((a, d) => a + d.totalHours, 0) / denom;
  const avgNapHours = daysWithData.reduce((a, d) => a + d.napHours, 0) / denom;

  const napCounts = getNapCountPerDay(sessions, periodDays);
  const napDays = napCounts.filter((d) => d.count > 0);
  const napCountAvg =
    napDays.length > 0
      ? napDays.reduce((a, d) => a + d.count, 0) / napDays.length
      : 0;

  const nightStretch = getLongestNightStretch(sessions, periodDays);
  const longestNightHours = Math.max(0, ...nightStretch.map((d) => d.hours));

  const adherencePct = Math.min(
    100,
    Math.round((avgTotalHours / schedule.totalSleepHours) * 100)
  );

  const env = computeEnvironmentCorrelation(sessions);
  const bestEnvironment = env.bestTemperature
    ? `${env.bestTemperature.label} (qualidade média ${env.bestTemperature.avgQuality}/5)`
    : null;

  const periodStart = daily[0]?.date ?? "";
  const periodEnd = daily[daily.length - 1]?.date ?? "";

  return {
    babyName: baby.name,
    birthDate: format(parseISO(baby.birth_date), "dd/MM/yyyy"),
    ageLabel: schedule.ageLabel,
    periodDays,
    periodLabel: `${periodStart} – ${periodEnd}`,
    generatedAt: format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
    avgTotalHours: Number.isFinite(avgTotalHours) ? avgTotalHours : 0,
    targetTotalHours: schedule.totalSleepHours,
    adherencePct,
    avgNapHours: Number.isFinite(avgNapHours) ? avgNapHours : 0,
    napCountAvg,
    napCountTarget: schedule.napCount,
    longestNightHours,
    targetNightHours: schedule.nightSleepHours,
    totalSessions: sessions.filter((s) => s.duration_min != null).length,
    daily,
    bestEnvironment,
    envWeather: env.weather.slice(0, 4).map((w) => ({
      label: w.label,
      count: w.count,
      avgQuality: w.avgQuality,
    })),
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2430",
    backgroundColor: "#ffffff",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#7c5cff",
    paddingBottom: 12,
    marginBottom: 20,
  },
  brand: {
    fontSize: 11,
    color: "#7c5cff",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#15171c",
  },
  subtitle: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 4,
  },
  metaItem: {
    width: "50%",
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 8,
    color: "#9ca3af",
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#15171c",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#15171c",
    marginBottom: 10,
    marginTop: 8,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  statCard: {
    width: "33.33%",
    padding: 4,
  },
  statCardInner: {
    backgroundColor: "#f6f5fb",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ece9f7",
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#15171c",
  },
  statLabel: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 2,
  },
  statTarget: {
    fontSize: 8,
    color: "#7c5cff",
    marginTop: 2,
  },
  table: {
    marginTop: 6,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eceef2",
    paddingVertical: 5,
  },
  th: {
    fontSize: 8,
    color: "#9ca3af",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  td: {
    fontSize: 9,
    color: "#1f2430",
  },
  col1: { width: "40%" },
  col2: { width: "20%", textAlign: "right" },
  col3: { width: "20%", textAlign: "right" },
  col4: { width: "20%", textAlign: "right" },
  envBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#dcfce7",
    marginTop: 6,
  },
  envText: {
    fontSize: 10,
    color: "#166534",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#eceef2",
    paddingTop: 8,
  },
});

function Stat({
  value,
  label,
  target,
}: {
  value: string;
  label: string;
  target?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardInner}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {target ? <Text style={styles.statTarget}>{target}</Text> : null}
      </View>
    </View>
  );
}

export function SleepReportPdf({ data }: { data: SleepReportData }) {
  return (
    <Document
      title={`Relatório de sono — ${data.babyName}`}
      author="Soninho"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>SONINHO</Text>
          <Text style={styles.title}>Relatório de sono</Text>
          <Text style={styles.subtitle}>
            Documento de apoio para consulta pediátrica
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Bebê</Text>
            <Text style={styles.metaValue}>{data.babyName}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Nascimento</Text>
            <Text style={styles.metaValue}>{data.birthDate}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Faixa etária</Text>
            <Text style={styles.metaValue}>{data.ageLabel}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Período analisado</Text>
            <Text style={styles.metaValue}>
              Últimos {data.periodDays} dias
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Resumo do período</Text>
        <View style={styles.statGrid}>
          <Stat
            value={`${data.avgTotalHours.toFixed(1)}h`}
            label="Sono total / dia"
            target={`Meta: ${data.targetTotalHours}h`}
          />
          <Stat
            value={`${data.adherencePct}%`}
            label="Aderência à meta"
          />
          <Stat
            value={`${data.avgNapHours.toFixed(1)}h`}
            label="Média de soneca / dia"
          />
          <Stat
            value={data.napCountAvg.toFixed(1)}
            label="Sonecas / dia"
            target={`Esperado: ${data.napCountTarget}`}
          />
          <Stat
            value={`${data.longestNightHours.toFixed(1)}h`}
            label="Maior trecho noturno"
            target={`Ref: ${data.targetNightHours}h`}
          />
          <Stat
            value={`${data.totalSessions}`}
            label="Registros no período"
          />
        </View>

        <Text style={styles.sectionTitle}>Detalhamento diário</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.th, styles.col1]}>Dia</Text>
            <Text style={[styles.th, styles.col2]}>Total</Text>
            <Text style={[styles.th, styles.col3]}>Sonecas</Text>
            <Text style={[styles.th, styles.col4]}>Noturno</Text>
          </View>
          {data.daily.map((d, i) => (
            <View style={styles.tr} key={i}>
              <Text style={[styles.td, styles.col1]}>{d.date}</Text>
              <Text style={[styles.td, styles.col2]}>
                {d.totalHours.toFixed(1)}h
              </Text>
              <Text style={[styles.td, styles.col3]}>
                {d.napHours.toFixed(1)}h
              </Text>
              <Text style={[styles.td, styles.col4]}>
                {d.nightHours.toFixed(1)}h
              </Text>
            </View>
          ))}
        </View>

        {(data.bestEnvironment || data.envWeather.length > 0) && (
          <>
            <Text style={styles.sectionTitle}>Ambiente e sono</Text>
            {data.bestEnvironment && (
              <View style={styles.envBox}>
                <Text style={styles.envText}>
                  Melhor desempenho de sono na faixa de {data.bestEnvironment}.
                </Text>
              </View>
            )}
          </>
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Gerado pelo Soninho em ${data.generatedAt}  ·  Página ${pageNumber}/${totalPages}  ·  Este relatório é informativo e não substitui avaliação médica.`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
