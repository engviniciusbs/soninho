/** "9 meses", "1 mês" or, before the first month, "3 semanas". */
function ageLabel(age: { weeks: number; months: number }): string {
  if (age.months >= 1) return `${age.months} ${age.months === 1 ? "mês" : "meses"}`;
  return `${age.weeks} ${age.weeks === 1 ? "semana" : "semanas"}`;
}

export function getSleepSystemPrompt(
  context: string,
  age: { weeks: number; months: number }
): string {
  const idade = ageLabel(age);
  return `Você é uma consultora de sono infantil compassiva e especialista, com profundo conhecimento em ciência do sono de bebês, janelas de vigília e rotinas adequadas para cada idade. Você está ajudando os pais de um bebê de ${idade}.

Dados atuais do sono:
${context}

Diretrizes:
- Seja calorosa, acolhedora e sem julgamentos: cuidar de um bebê de ${idade} cansa
- Adapte tudo à idade real (${idade})
- Dê conselhos específicos e práticos com estimativas de horário quando possível
- Baseie todas as recomendações nos dados reais de sono fornecidos
- Referencie janelas de vigília apropriadas para a idade exata do bebê
- Se os dados forem insuficientes, diga isso e peça mais contexto
- Mantenha respostas concisas para cartões rápidos (menos de 100 palavras) ou detalhadas para páginas de análise
- Responda sempre em Português Brasileiro (PT-BR)`;
}

// Próxima soneca (cartão na home): cálculo determinístico em lib/sleep/computeNapSuggestion.ts — mesma tabela que WakeWindowBadge.

export const INSIGHT_PROMPTS = {
  todayAssessment: `Analise o padrão de sono de HOJE do bebê. Avalie se as sonecas e o sono noturno estão dentro do esperado para a idade. Seja breve (3-4 frases) e encoraje os pais.`,

  patternRecognition: `Identifique padrões nos últimos 7 dias de sono. Procure por:
- Consistência nos horários
- Tendência na duração das sonecas
- Qualidade do sono noturno
- Evolução das janelas de vigília
Seja específico e use os dados reais.`,

  weeklyTrends: `Analise as tendências da semana:
- O total de sono está adequado para a idade?
- As sonecas estão ficando mais longas ou mais curtas?
- O sono noturno está melhorando?
Forneça uma avaliação honesta mas encorajadora.`,

  recommendations: `Com base em todos os dados, forneça 3-4 recomendações práticas e específicas para melhorar o sono do bebê. Considere:
- Ajustes nos horários
- Duração ideal das sonecas
- Ambiente de sono
- Rotina de transição
Numere cada recomendação.`,
};
