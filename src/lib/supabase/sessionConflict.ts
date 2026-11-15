/** Postgres unique_violation, raised by the one-open-session-per-baby indexes. */
export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

/** Postgres check_violation, e.g. the `end_time >= start_time` constraints. */
export function isCheckViolation(error: { code?: string } | null): boolean {
  return error?.code === "23514";
}

export type LiveSessionStatus = "running" | "ended" | "mismatch" | "unknown";

/**
 * Interprets a poll of one session row (looked up by its id) for the timer of
 * `babyId`. Only a response WITHOUT error can stop the local timer: a network
 * or auth error is "unknown" and the timer is kept.
 * - "ended": no row for that id, or end_time filled (another caregiver stopped
 *   or deleted it);
 * - "mismatch": the row belongs to another baby (stale state migrated from the
 *   single-timer store) — drop the local timer silently;
 * - "running": still open.
 */
export function classifyLiveSession(
  result: {
    data: { baby_id: string; end_time: string | null } | null;
    error: unknown;
  },
  babyId: string
): LiveSessionStatus {
  if (result.error) return "unknown";
  if (!result.data || result.data.end_time) return "ended";
  if (result.data.baby_id !== babyId) return "mismatch";
  return "running";
}
