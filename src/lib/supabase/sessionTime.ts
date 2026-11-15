/**
 * End time to write when stopping a session: `max(now, start)`.
 *
 * Sessions can be started on one caregiver's phone and stopped on another's;
 * with clock skew "now" on the stopping phone may be before the stored start,
 * which the `end_time >= start_time` constraints reject (23514) — leaving a
 * short session impossible to stop. Clamping keeps it stoppable (duration 0).
 */
export function clampEndTime(startIso: string, now: Date | number = Date.now()): string {
  const nowMs = typeof now === "number" ? now : now.getTime();
  let startMs = Date.parse(startIso);
  if (Number.isNaN(startMs)) return new Date(nowMs).toISOString();
  // Postgres keeps microseconds ("…13.830301+00:00") but JS dates stop at
  // milliseconds: round such a start UP, or the clamped end would still be
  // a few µs before it and violate the constraint.
  const fraction = /\.\d{3}(\d+)/.exec(startIso)?.[1];
  if (fraction && /[1-9]/.test(fraction)) startMs += 1;
  return new Date(Math.max(nowMs, startMs)).toISOString();
}
