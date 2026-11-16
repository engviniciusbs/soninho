const cache = new Map<string, Intl.NumberFormat>();

function formatter(digits: number, fixed: boolean): Intl.NumberFormat {
  const key = `${digits}:${fixed}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: fixed ? digits : 0,
      maximumFractionDigits: digits,
    });
    cache.set(key, f);
  }
  return f;
}

/**
 * A decimal as shown to the user, in pt-BR ("22,5"): comma separator, at most
 * `digits` fraction digits (default 1). With `fixed`, always `digits` of them
 * ("1,0").
 */
export function formatDecimal(n: number, digits = 1, opts: { fixed?: boolean } = {}): string {
  return formatter(digits, opts.fixed ?? false).format(n);
}
