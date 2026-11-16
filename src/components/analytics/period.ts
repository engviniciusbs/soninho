"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export const ANALYTICS_PERIODS = [7, 14, 30] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];
export const DEFAULT_PERIOD: AnalyticsPeriod = 7;

export function parsePeriod(raw: string | null): AnalyticsPeriod {
  const n = Number(raw);
  return (ANALYTICS_PERIODS as readonly number[]).includes(n) ? (n as AnalyticsPeriod) : DEFAULT_PERIOD;
}

/** `href` with `?periodo=` when the period is not the default one. */
export function withPeriod(href: string, period: AnalyticsPeriod): string {
  return period === DEFAULT_PERIOD ? href : `${href}?periodo=${period}`;
}

/**
 * The period of Análise and its detail screens (`?periodo=7|14|30`, 7 when
 * absent or unknown). A pick shows at once, then is read back from the URL,
 * the same pattern as Registro's `?dia=`. Needs a `<Suspense>` above it.
 */
export function usePeriod(): [AnalyticsPeriod, (next: AnalyticsPeriod) => void] {
  const param = useSearchParams().get("periodo");
  const [picked, setPicked] = useState<{ param: string | null; value: AnalyticsPeriod } | null>(null);
  const period = picked && picked.param === param ? picked.value : parsePeriod(param);

  function set(next: AnalyticsPeriod) {
    setPicked({ param, value: next });
    const url = new URL(window.location.href);
    if (next === DEFAULT_PERIOD) url.searchParams.delete("periodo");
    else url.searchParams.set("periodo", String(next));
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  return [period, set];
}
