import type { BreastSide } from "@/types";

/** The side fields of an open breastfeeding row. */
export interface BreastSidesRow {
  start_time: string;
  last_side: string | null;
  side_left_sec: number | null;
  side_right_sec: number | null;
  /** Start of the side in progress; null on rows written before this column. */
  side_started_at?: string | null;
  updated_at?: string | null;
}

export function sideOf(row: Pick<BreastSidesRow, "last_side">): BreastSide {
  return row.last_side === "RIGHT" ? "RIGHT" : "LEFT";
}

/**
 * When the side in progress started. Rows opened before `side_started_at`
 * existed fall back to `updated_at` (the old app only updated an open row on a
 * side switch, and the trigger stamps every update) and then to `start_time`.
 */
export function sideStartOf(row: BreastSidesRow): string {
  return row.side_started_at ?? row.updated_at ?? row.start_time;
}

/** Totals of both sides at `nowMs`: stored seconds plus the side in progress. */
export function breastTotalsAt(
  row: BreastSidesRow,
  nowMs: number = Date.now()
): { left: number; right: number } {
  const running = Math.max(0, Math.floor((nowMs - new Date(sideStartOf(row)).getTime()) / 1000));
  const left = row.side_left_sec ?? 0;
  const right = row.side_right_sec ?? 0;
  return sideOf(row) === "LEFT"
    ? { left: left + running, right }
    : { left, right: right + running };
}
