import type { SleepSession } from "@/types";

/**
 * A sleep still running, counted up to `now`: a copy with `end_time = now`
 * and its duration. A finished sleep comes back as is, and so does a running
 * one whose start is not before `now` (clock skew), so no duration is ever
 * negative. Used wherever a running sleep must count (Registro, Análise).
 */
export function withProvisionalEnd(session: SleepSession, now: Date | number): SleepSession {
  if (session.end_time) return session;
  const at = typeof now === "number" ? now : now.getTime();
  const start = Date.parse(session.start_time);
  if (!(at > start)) return session;
  return { ...session, end_time: new Date(at).toISOString(), duration_min: (at - start) / 60_000 };
}
