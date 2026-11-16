import type { FeedingSuggestion } from "@/types";

/**
 * Diz de onde veio a previsão. computeFeedingSuggestion devolve
 * avgIntervalMinutes só quando usou o histórico; sem ele, usou a faixa da idade.
 */
export function feedingExplanation(s: FeedingSuggestion): string {
  return s.avgIntervalMinutes != null
    ? "Pelo intervalo das últimas mamadas"
    : "Pela faixa esperada para a idade";
}
