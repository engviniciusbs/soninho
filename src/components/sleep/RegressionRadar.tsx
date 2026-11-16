"use client";

import { IconAlert, IconRadar, IconSpark } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { useRegression } from "@/hooks/useRegression";

/** The full regression radar (Análise › Radar de regressões): calm or alert, with the explanation and tips. */
export function RegressionRadar() {
  const { data, isLoading, isPending, refetch } = useRegression();

  if (isLoading || (isPending && data === undefined)) {
    return <Skeleton aria-busy="true" className="h-28 w-full rounded-[24px]" />;
  }

  // The request failed (`useRegression` returns null): say so, not "all calm".
  if (data === null) {
    return (
      <Card role="alert" className="gap-2 px-[18px]">
        <p className="font-sans text-[15px] font-semibold text-sn-tx">Não foi possível verificar regressões agora.</p>
        <Button variant="secondary" size="sm" className="self-start" onClick={() => void refetch?.()}>
          Tentar de novo
        </Button>
      </Card>
    );
  }

  if (!data) return null;

  // ── Calm state ──────────────────────────────────────────────────────────
  if (!data.detected) {
    return (
      <Card className="flex-row items-start gap-3 px-[18px]">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-sn-s2 text-sn-ok">
          <IconRadar size={22} />
        </span>
        <div className="min-w-0">
          <p className="font-sans text-base font-bold text-sn-tx">Radar de regressões</p>
          <p className="mt-0.5 font-sans text-[15px] font-semibold text-sn-mu">{data.summary}</p>
        </div>
      </Card>
    );
  }

  // ── Alert state ─────────────────────────────────────────────────────────
  return (
    <Card className="flex-row items-start gap-3 border-sn-warn/50 bg-sn-warn/8 px-[18px]">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-sn-warn/15 text-sn-warn">
        <IconAlert size={22} />
      </span>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-sans text-base font-bold text-sn-tx">Radar de regressões</p>
          {data.ageWindow && <StatusPill tone="alert">{data.ageWindow}</StatusPill>}
        </div>

        <p className="font-sans text-[15px] leading-relaxed font-semibold text-sn-mu">
          {data.explanation ?? data.summary}
        </p>

        {data.tips.length > 0 && (
          <ul className="space-y-1.5 pt-1">
            {data.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 font-sans text-[15px] font-semibold text-sn-mu">
                <span aria-hidden="true" className="mt-1 shrink-0 text-sn-warn">
                  <IconSpark size={14} />
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
