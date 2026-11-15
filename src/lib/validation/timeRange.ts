export const END_BEFORE_START_MESSAGE = "O fim não pode ser antes do início";

/** True when both instants are valid and end is strictly before start. */
export function isEndBeforeStart(start: string | Date, end: string | Date): boolean {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return !Number.isNaN(s) && !Number.isNaN(e) && e < s;
}

/** Postgres check_violation (end_time >= start_time constraints). */
export function isCheckViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23514";
}
