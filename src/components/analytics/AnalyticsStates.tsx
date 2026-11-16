"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** A failed load: says so and offers a retry, never a false empty state. */
export function AnalyticsError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card role="alert" className="gap-2 px-[18px]">
      <p className="font-sans text-[15px] font-semibold text-sn-tx">Não foi possível carregar a análise.</p>
      <Button variant="secondary" size="sm" className="self-start" onClick={onRetry}>
        Tentar de novo
      </Button>
    </Card>
  );
}

/** No sleep to analyse: what goes here and the action that fills it. */
export function AnalyticsEmpty({ message }: { message: string }) {
  return (
    <Card className="gap-2 px-[18px]">
      <p className="font-sans text-base font-bold text-sn-tx">{message}</p>
      <p className="font-sans text-[15px] font-semibold text-sn-mu">
        Os números e os gráficos aparecem aqui conforme os sonos forem registrados no Início.
      </p>
      <Link href="/app" className={buttonVariants({ variant: "secondary", size: "sm", className: "self-start" })}>
        Registrar um sono
      </Link>
    </Card>
  );
}

/** Loading, in the shape of a figures row and a chart card. */
export function AnalyticsSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[74px] rounded-[18px]" />
        ))}
      </div>
      <Skeleton className="h-[236px] w-full rounded-[24px]" />
    </div>
  );
}
