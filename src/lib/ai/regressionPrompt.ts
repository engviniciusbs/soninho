import type { BabySex } from "@/types";
import { genderRule, sexLine } from "@/lib/ai/prompts";

export interface RegressionPromptInput {
  ageWeeks: number;
  ageMonths: number;
  sex: BabySex | null;
  /** Classic regression window the baby is in, if any. */
  ageWindowLabel: string | null;
  sleepDropHours: number;
  wakeIncrease: number;
  targetHours: number;
  avgHours: number;
}

/**
 * Messages for the regression explanation (Análise › Radar de regressões).
 * The explanation and tips are shown to the family, so they follow the same
 * gender rule as the chat prompt (neutral when the sex is not informed).
 */
export function buildRegressionMessages(input: RegressionPromptInput) {
  const context = [
    `Idade do bebê: ${input.ageWeeks} semanas (${input.ageMonths} meses).`,
    `${sexLine(input.sex)}.`,
    input.ageWindowLabel
      ? `Está na fase de ${input.ageWindowLabel}.`
      : "Fora de janelas clássicas de regressão.",
    input.sleepDropHours > 0
      ? `Queda média de ${input.sleepDropHours}h/dia no sono recente.`
      : "Sem queda relevante no total de sono.",
    input.wakeIncrease > 0
      ? `Aumento de ~${input.wakeIncrease} despertar(es) por noite.`
      : "Sem aumento claro de despertares.",
    `Meta de sono para a idade: ${input.targetHours}h/dia; média atual ${input.avgHours}h/dia.`,
  ].join(" ");

  return [
    {
      role: "system" as const,
      content:
        "Você é um consultor de sono infantil acolhedor e baseado em evidências. " +
        "Responda SEMPRE em português do Brasil e SOMENTE em JSON válido com as chaves " +
        '"explanation" (string curta, 1-2 frases, tom tranquilizador) e "tips" ' +
        "(array de 2 a 3 strings curtas e acionáveis). Não dê diagnóstico médico. " +
        genderRule(input.sex),
    },
    {
      role: "user" as const,
      content: `Contexto do bebê: ${context}\n\nExplique de forma breve o que pode estar acontecendo e dê 2-3 dicas práticas.`,
    },
  ];
}
