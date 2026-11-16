import type { QueryClient } from "@tanstack/react-query";

/**
 * Marks stale every query derived from a baby's sleep sessions, so the home
 * (forecast, wake window), Registro, Análise and the regression notice refetch
 * after a sleep is created, edited, stopped or deleted.
 *
 * Keys (prefix match):
 * - ["sleep-sessions"]: every list (home today, history, analytics, report);
 * - ["last-session", babyId]: useWakeWindow;
 * - ["last-session-key", babyId]: anchor of the suggestion and the regression;
 * - ["ai-suggestion", babyId]: useAISuggestions;
 * - ["regression", babyId]: useRegression.
 */
export async function invalidateSleepQueries(qc: QueryClient, babyId: string): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ["sleep-sessions"] }),
    qc.invalidateQueries({ queryKey: ["last-session", babyId] }),
    qc.invalidateQueries({ queryKey: ["last-session-key", babyId] }),
    qc.invalidateQueries({ queryKey: ["ai-suggestion", babyId] }),
    qc.invalidateQueries({ queryKey: ["regression", babyId] }),
  ]);
}
