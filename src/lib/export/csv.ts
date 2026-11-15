const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[,"\n;\r]/;

/** Serialises one CSV cell, neutralising spreadsheet formula injection. */
export function toCsvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (FORMULA_PREFIX.test(s)) s = `'${s}`;
  if (NEEDS_QUOTES.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(toCsvCell).join(",")).join("\n");
}
