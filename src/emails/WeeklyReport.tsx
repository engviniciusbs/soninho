import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface WeeklyReportBabyStats {
  name: string;
  emoji: string;
  ageLabel: string;
  avgTotalHours: number;
  targetTotalHours: number;
  avgNapHours: number;
  napCountAvg: number;
  longestNightHours: number;
  adherencePct: number;
  bestEnvironment: string | null;
}

export interface WeeklyReportProps {
  parentName: string;
  periodLabel: string;
  babies: WeeklyReportBabyStats[];
  appUrl: string;
}

const main = {
  backgroundColor: "#0f1115",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "24px 0 40px",
  maxWidth: "560px",
};

const card = {
  backgroundColor: "#181b22",
  borderRadius: "16px",
  border: "1px solid #262a33",
  padding: "24px",
  margin: "0 16px",
};

const brand = {
  color: "#a78bfa",
  fontSize: "14px",
  fontWeight: 700 as const,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  margin: "0 0 4px",
};

const h1 = {
  color: "#f4f4f5",
  fontSize: "22px",
  fontWeight: 700 as const,
  margin: "0 0 4px",
};

const subtitle = {
  color: "#9ca3af",
  fontSize: "14px",
  margin: "0 0 20px",
};

const babyName = {
  color: "#f4f4f5",
  fontSize: "17px",
  fontWeight: 600 as const,
  margin: "0 0 2px",
};

const ageText = {
  color: "#9ca3af",
  fontSize: "13px",
  margin: "0 0 12px",
};

const statRow = {
  margin: "0 0 8px",
};

const statLabel = {
  color: "#9ca3af",
  fontSize: "13px",
  display: "inline-block" as const,
};

const statValue = {
  color: "#f4f4f5",
  fontSize: "14px",
  fontWeight: 600 as const,
};

const hr = {
  borderColor: "#262a33",
  margin: "20px 0",
};

const footer = {
  color: "#6b7280",
  fontSize: "12px",
  textAlign: "center" as const,
  margin: "20px 16px 0",
};

const link = {
  color: "#a78bfa",
  textDecoration: "none",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <table width="100%" style={statRow} cellPadding={0} cellSpacing={0}>
      <tbody>
        <tr>
          <td style={statLabel}>{label}</td>
          <td align="right">
            <span style={statValue}>{value}</span>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default function WeeklyReport({
  parentName,
  periodLabel,
  babies,
  appUrl,
}: WeeklyReportProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Seu resumo de sono da semana no Soninho</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={card}>
            <Text style={brand}>Soninho</Text>
            <Heading style={h1}>Resumo da semana 🌙</Heading>
            <Text style={subtitle}>
              Olá{parentName ? `, ${parentName}` : ""}! Aqui está como foi o
              sono {periodLabel}.
            </Text>

            {babies.map((b, idx) => (
              <div key={idx}>
                {idx > 0 && <Hr style={hr} />}
                <Text style={babyName}>
                  {b.emoji} {b.name}
                </Text>
                <Text style={ageText}>{b.ageLabel}</Text>

                <Stat
                  label="Sono total / dia"
                  value={`${b.avgTotalHours.toFixed(1)}h (meta ${b.targetTotalHours}h)`}
                />
                <Stat
                  label="Aderência à meta"
                  value={`${b.adherencePct}%`}
                />
                <Stat
                  label="Média de soneca"
                  value={`${b.avgNapHours.toFixed(1)}h`}
                />
                <Stat
                  label="Sonecas / dia"
                  value={`${b.napCountAvg.toFixed(1)}`}
                />
                <Stat
                  label="Maior trecho noturno"
                  value={`${b.longestNightHours.toFixed(1)}h`}
                />
                {b.bestEnvironment && (
                  <Stat label="Melhor ambiente" value={b.bestEnvironment} />
                )}
              </div>
            ))}
          </Section>

          <Text style={footer}>
            Veja mais detalhes no{" "}
            <a href={appUrl} style={link}>
              app Soninho
            </a>
            .<br />
            Para parar de receber este resumo, ajuste em Configurações →
            Notificações.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
