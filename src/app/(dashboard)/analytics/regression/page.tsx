"use client";

import { Suspense } from "react";
import { usePeriod, withPeriod } from "@/components/analytics/period";
import { RegressionRadar } from "@/components/sleep/RegressionRadar";
import { DetailHeader } from "@/components/ui/detail-header";

const TITLE = "Radar de regressões";

function RegressionHeader() {
  const [period] = usePeriod();
  return <DetailHeader title={TITLE} backHref={withPeriod("/analytics", period)} />;
}

export default function AnalyticsRegressionPage() {
  return (
    <div>
      <Suspense fallback={<DetailHeader title={TITLE} backHref="/analytics" />}>
        <RegressionHeader />
      </Suspense>
      <RegressionRadar />
    </div>
  );
}
