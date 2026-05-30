import type { CSSProperties } from "react";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { emailTheme, fontLink } from "@/emails/theme";

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
  reportTitle?: string;
  previewText?: string;
  footerNote?: string;
}

const t = emailTheme;

const main: CSSProperties = {
  backgroundColor: t.bg,
  fontFamily: t.fontBody,
  margin: 0,
  padding: 0,
};

const outer: CSSProperties = {
  margin: "0 auto",
  maxWidth: "600px",
  padding: "32px 16px 48px",
};

const headerWrap: CSSProperties = {
  textAlign: "center",
  marginBottom: "28px",
};

const wordmark: CSSProperties = {
  fontFamily: t.fontDisplay,
  fontSize: "22px",
  fontWeight: 700,
  color: t.foreground,
  letterSpacing: "-0.02em",
  margin: "12px 0 0",
  lineHeight: "1.2",
};

const tagline: CSSProperties = {
  fontSize: "13px",
  color: t.muted,
  margin: "6px 0 0",
  lineHeight: "1.5",
};

const card: CSSProperties = {
  backgroundColor: t.card,
  borderRadius: t.radius,
  border: `1px solid ${t.border}`,
  padding: "28px 24px",
  boxShadow: "0 8px 24px -16px rgba(0, 0, 0, 0.55)",
};

const periodBadge: CSSProperties = {
  display: "inline-block",
  backgroundColor: "rgba(129, 140, 248, 0.12)",
  border: `1px solid rgba(129, 140, 248, 0.28)`,
  borderRadius: "999px",
  color: t.lavender,
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.04em",
  margin: "0 0 16px",
  padding: "6px 14px",
  textTransform: "uppercase",
};

const h1: CSSProperties = {
  fontFamily: t.fontDisplay,
  fontSize: "26px",
  fontWeight: 700,
  color: t.foreground,
  letterSpacing: "-0.02em",
  lineHeight: "1.25",
  margin: "0 0 10px",
};

const intro: CSSProperties = {
  color: t.muted,
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 28px",
};

const babyCard: CSSProperties = {
  backgroundColor: t.cardMuted,
  border: `1px solid ${t.border}`,
  borderRadius: t.radiusSm,
  marginBottom: "16px",
  padding: "20px 18px",
};

const babyHeader: CSSProperties = {
  marginBottom: "16px",
};

const babyName: CSSProperties = {
  color: t.foreground,
  fontSize: "18px",
  fontWeight: 700,
  margin: "0 0 4px",
  lineHeight: "1.3",
};

const babyAge: CSSProperties = {
  color: t.muted,
  fontSize: "13px",
  margin: 0,
};

const statGridLabel: CSSProperties = {
  color: t.muted,
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.06em",
  margin: "0 0 6px",
  textTransform: "uppercase",
};

const statGridValue: CSSProperties = {
  color: t.foreground,
  fontSize: "20px",
  fontWeight: 700,
  fontFamily: t.fontDisplay,
  letterSpacing: "-0.02em",
  margin: 0,
  lineHeight: "1.2",
};

const statGridUnit: CSSProperties = {
  color: t.muted,
  fontSize: "12px",
  fontWeight: 500,
};

const statCell: CSSProperties = {
  padding: "0 8px 16px 0",
  verticalAlign: "top",
  width: "50%",
};

const progressTrack: CSSProperties = {
  backgroundColor: "rgba(255, 255, 255, 0.06)",
  borderRadius: "999px",
  height: "8px",
  overflow: "hidden",
  width: "100%",
};

const progressFill = (pct: number): CSSProperties => ({
  backgroundColor: pct >= 80 ? t.success : pct >= 50 ? t.primary : t.warning,
  borderRadius: "999px",
  height: "8px",
  width: `${Math.min(100, Math.max(0, pct))}%`,
});

const progressMeta: CSSProperties = {
  color: t.muted,
  fontSize: "12px",
  margin: "8px 0 0",
};

const envBox: CSSProperties = {
  backgroundColor: "rgba(129, 140, 248, 0.08)",
  border: `1px solid rgba(129, 140, 248, 0.18)`,
  borderRadius: t.radiusSm,
  marginTop: "4px",
  padding: "12px 14px",
};

const envLabel: CSSProperties = {
  color: t.lavender,
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.05em",
  margin: "0 0 4px",
  textTransform: "uppercase",
};

const envValue: CSSProperties = {
  color: t.foreground,
  fontSize: "13px",
  lineHeight: "1.5",
  margin: 0,
};

const ctaWrap: CSSProperties = {
  marginTop: "28px",
  textAlign: "center",
};

const ctaButton: CSSProperties = {
  backgroundColor: t.primary,
  borderRadius: "12px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 700,
  padding: "14px 28px",
  textDecoration: "none",
};

const footer: CSSProperties = {
  color: t.muted,
  fontSize: "12px",
  lineHeight: "1.6",
  margin: "28px 8px 0",
  textAlign: "center",
};

const footerLink: CSSProperties = {
  color: t.primary,
  textDecoration: "none",
};

const hr: CSSProperties = {
  borderColor: t.border,
  margin: "24px 0",
};

function StatCell({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <Column style={statCell}>
      <Text style={statGridLabel}>{label}</Text>
      <Text style={statGridValue}>
        {value}
        {unit ? <span style={statGridUnit}> {unit}</span> : null}
      </Text>
    </Column>
  );
}

function BabySection({ baby }: { baby: WeeklyReportBabyStats }) {
  return (
    <Section style={babyCard}>
      <div style={babyHeader}>
        <Text style={babyName}>
          {baby.emoji} {baby.name}
        </Text>
        <Text style={babyAge}>{baby.ageLabel}</Text>
      </div>

      <Section style={{ marginBottom: "18px" }}>
        <Text style={statGridLabel}>Aderência à meta de sono</Text>
        <div style={progressTrack}>
          <div style={progressFill(baby.adherencePct)} />
        </div>
        <Text style={progressMeta}>
          {baby.adherencePct}% · meta {baby.targetTotalHours}h/dia · média{" "}
          {baby.avgTotalHours.toFixed(1)}h
        </Text>
      </Section>

      <Row>
        <StatCell
          label="Sono total"
          value={baby.avgTotalHours.toFixed(1)}
          unit="h/dia"
        />
        <StatCell
          label="Sonecas"
          value={baby.napCountAvg.toFixed(1)}
          unit="/ dia"
        />
      </Row>
      <Row>
        <StatCell
          label="Média soneca"
          value={baby.avgNapHours.toFixed(1)}
          unit="h"
        />
        <StatCell
          label="Trecho noturno"
          value={baby.longestNightHours.toFixed(1)}
          unit="h máx."
        />
      </Row>

      {baby.bestEnvironment ? (
        <Section style={envBox}>
          <Text style={envLabel}>Melhor ambiente</Text>
          <Text style={envValue}>{baby.bestEnvironment}</Text>
        </Section>
      ) : null}
    </Section>
  );
}

export default function WeeklyReport({
  parentName,
  periodLabel,
  babies,
  appUrl,
  reportTitle = "Resumo de sono",
  previewText = "Seu resumo de sono no Soninho",
  footerNote,
}: WeeklyReportProps) {
  const logoUrl = `${appUrl.replace(/\/$/, "")}/brand/soninho-mark@2x.png`;

  return (
    <Html lang="pt-BR">
      <Head>
        <link href={fontLink} rel="stylesheet" />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={outer}>
          {/* Brand header */}
          <Section style={headerWrap}>
            <Link href={appUrl} style={{ textDecoration: "none" }}>
              <Img
                src={logoUrl}
                width={56}
                height={56}
                alt="Soninho"
                style={{ margin: "0 auto" }}
              />
              <Text style={wordmark}>Soninho</Text>
            </Link>
            <Text style={tagline}>Monitor de sono do bebê</Text>
          </Section>

          {/* Main card */}
          <Section style={card}>
            <Text style={periodBadge}>{periodLabel}</Text>
            <Heading as="h1" style={h1}>
              {reportTitle}
            </Heading>
            <Text style={intro}>
              Olá{parentName ? `, ${parentName}` : ""}! Confira como foi o sono
              da família no período abaixo — totais, sonecas e aderência à meta
              por idade.
            </Text>

            {babies.map((baby, idx) => (
              <div key={`${baby.name}-${idx}`}>
                {idx > 0 ? <Hr style={hr} /> : null}
                <BabySection baby={baby} />
              </div>
            ))}

            <Section style={ctaWrap}>
              <Button href={appUrl} style={ctaButton}>
                Abrir no Soninho
              </Button>
            </Section>
          </Section>

          {/* Footer */}
          <Text style={footer}>
            {footerNote ? (
              <>
                {footerNote}
                <br />
                <br />
              </>
            ) : null}
            Enviado por{" "}
            <Link href={appUrl} style={footerLink}>
              soninho.baby
            </Link>
            {footerNote ? null : (
              <>
                <br />
                Para desativar o resumo semanal automático, acesse Configurações
                → Notificações.
              </>
            )}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
