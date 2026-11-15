/**
 * Minimal in-memory stand-in for the browser Supabase client, enough for the
 * live-timer queries (`from().select|insert|update().eq().is().single|maybeSingle()`).
 * It models the two DB rules the timers depend on:
 * - one open session (end_time null) per baby per table → insert fails 23505;
 * - `.single()` over 0 rows → PGRST116 (the guarded end update lost the race).
 * Errors can be forced per table/operation to simulate network failures.
 */
type Row = { id: string; [key: string]: unknown };
type Op = "select" | "insert" | "update";
type Result = { data: unknown; error: { code?: string; message: string } | null };

export interface FakeSupabase {
  tables: Record<string, Row[]>;
  /** Forced error for every `op` on `table` until cleared with `null`. */
  setError: (table: string, op: Op, error: { code?: string; message: string } | null) => void;
  seed: (table: string, row: Row) => void;
  rows: (table: string) => Row[];
  client: { from: (table: string) => QueryBuilder };
}

interface QueryBuilder {
  select: (cols?: string) => QueryBuilder;
  insert: (payload: Record<string, unknown>) => QueryBuilder;
  update: (patch: Record<string, unknown>) => QueryBuilder;
  eq: (col: string, value: unknown) => QueryBuilder;
  is: (col: string, value: null) => QueryBuilder;
  single: () => Promise<Result>;
  maybeSingle: () => Promise<Result>;
}

const ROW_DEFAULTS: Record<string, Record<string, unknown>> = {
  sleep_sessions: { end_time: null },
  breastfeeding_sessions: {
    end_time: null,
    side_left_sec: 0,
    side_right_sec: 0,
    last_side: null,
    notes: null,
  },
};

export function createFakeSupabase(): FakeSupabase {
  const tables: Record<string, Row[]> = {};
  const errors = new Map<string, { code?: string; message: string }>();
  let seq = 0;

  const rowsOf = (table: string) => (tables[table] ??= []);

  function builder(table: string): QueryBuilder {
    let op: Op = "select";
    let payload: Record<string, unknown> = {};
    const filters: Array<(r: Row) => boolean> = [];

    function run(mode: "single" | "maybeSingle"): Promise<Result> {
      const forced = errors.get(`${table}:${op}`);
      if (forced) return Promise.resolve({ data: null, error: forced });
      const rows = rowsOf(table);

      if (op === "insert") {
        const open = rows.find((r) => r.baby_id === payload.baby_id && r.end_time == null);
        if (open && payload.end_time == null) {
          return Promise.resolve({
            data: null,
            error: { code: "23505", message: "duplicate key value violates unique constraint" },
          });
        }
        const row: Row = { ...ROW_DEFAULTS[table], ...payload, id: `${table}-${++seq}` };
        rows.push(row);
        return Promise.resolve({ data: { ...row }, error: null });
      }

      const matched = rows.filter((r) => filters.every((f) => f(r)));
      if (op === "update") matched.forEach((r) => Object.assign(r, payload));
      const first = matched[0] ? { ...matched[0] } : null;
      if (!first && mode === "single") {
        return Promise.resolve({
          data: null,
          error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" },
        });
      }
      return Promise.resolve({ data: first, error: null });
    }

    const q: QueryBuilder = {
      select: () => q,
      insert: (p) => ((op = "insert"), (payload = p), q),
      update: (p) => ((op = "update"), (payload = p), q),
      eq: (col, value) => (filters.push((r) => r[col] === value), q),
      is: (col, value) => (filters.push((r) => (r[col] ?? null) === value), q),
      single: () => run("single"),
      maybeSingle: () => run("maybeSingle"),
    };
    return q;
  }

  return {
    tables,
    setError: (table, op, error) => {
      if (error) errors.set(`${table}:${op}`, error);
      else errors.delete(`${table}:${op}`);
    },
    seed: (table, row) => {
      rowsOf(table).push({ ...ROW_DEFAULTS[table], ...row });
    },
    rows: rowsOf,
    client: { from: builder },
  };
}
