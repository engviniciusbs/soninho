/**
 * Links antigos que passam a apontar para as telas do Mais (spec §8.7).
 * Formato de `redirects` do `next.config.ts` (Next 16): a primeira regra que
 * casar vence, então as de `/settings?tab=…` vêm antes da de `/settings` puro.
 * Temporários (307) enquanto o redesign se assenta.
 */
export interface QueryCondition {
  type: "query";
  key: string;
  value: string;
}

export interface LegacyRedirect {
  source: string;
  destination: string;
  permanent: boolean;
  has?: QueryCondition[];
}

const SETTINGS_TABS: [tab: string, destination: string][] = [
  ["notifications", "/more/notifications"],
  ["tools", "/more/reports"],
  ["general", "/more"],
];

export function legacyRedirects(): LegacyRedirect[] {
  return [
    ...SETTINGS_TABS.map(([value, destination]) => ({
      source: "/settings",
      destination,
      permanent: false,
      has: [{ type: "query" as const, key: "tab", value }],
    })),
    { source: "/settings", destination: "/more", permanent: false },
    { source: "/ai-insights", destination: "/more/ai", permanent: false },
  ];
}
