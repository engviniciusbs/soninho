export type DayStatus = "within" | "below" | "above";

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  within: "Dentro do esperado",
  below: "Abaixo do esperado",
  above: "Acima do esperado",
};

const TOLERANCE_MIN = 60;

/**
 * Compara o sono do dia com a meta da idade (tolerância de 1h, limites
 * inclusivos). Dia sem registro, ou entrada não finita (NaN de um cálculo
 * quebrado), não tem status.
 */
export function dayStatus(totalMinutes: number, targetHours: number): DayStatus | null {
  if (!Number.isFinite(totalMinutes) || !Number.isFinite(targetHours)) return null;
  if (totalMinutes <= 0) return null;
  const target = targetHours * 60;
  if (totalMinutes < target - TOLERANCE_MIN) return "below";
  if (totalMinutes > target + TOLERANCE_MIN) return "above";
  return "within";
}
