/** Postgres unique_violation, raised by the one-open-session-per-baby indexes. */
export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}
