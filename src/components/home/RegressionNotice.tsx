"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { IconAlert, IconChevronRight } from "@/components/brand/icons";
import { useRegression } from "@/hooks/useRegression";

interface RegressionNoticeProps {
  /** Where the action goes (the full radar). */
  href?: string;
  actionLabel?: string;
}

/** Compact amber notice, only when a sleep regression is detected; the full radar is in Análise. */
export function RegressionNotice({
  href = "/analytics/regression",
  actionLabel = "Ver análise",
}: RegressionNoticeProps = {}) {
  const { data } = useRegression();
  if (!data?.detected) return null;

  return (
    <Card size="sm" className="flex-row items-start gap-3 border-sn-warn/50 bg-sn-warn/8 px-3.5">
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-sn-warn">
        <IconAlert size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-sans text-base font-bold text-sn-tx">Possível regressão de sono</p>
        <p className="font-sans text-sm font-semibold text-sn-mu">{data.summary}</p>
        <Link
          href={href}
          className="-mx-2 mt-1 inline-flex min-h-11 items-center gap-1 rounded-full px-2 font-sans text-sm font-bold text-sn-warn outline-none transition-transform duration-(--sn-dur-micro) ease-sn-out motion-reduce:transition-none hover:bg-sn-warn/10 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-warn"
        >
          {actionLabel}
          <IconChevronRight size={16} />
        </Link>
      </div>
    </Card>
  );
}
