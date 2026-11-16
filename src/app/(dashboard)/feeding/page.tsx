"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageTitle } from "@/components/ui/page-title";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { IconPen } from "@/components/brand/icons";
import { useBaby } from "@/components/providers/BabyProvider";
import { useActiveBreastTimer } from "@/store/feedingStore";
import { BottleQuickLog } from "@/components/feeding/BottleQuickLog";
import { BreastfeedingTimer } from "@/components/feeding/BreastfeedingTimer";
import { SolidFeedingLog } from "@/components/feeding/SolidFeedingLog";
import { FeedingSuggestionCard } from "@/components/feeding/FeedingSuggestionCard";
import { FeedingTimeline, useDeleteFeeding } from "@/components/feeding/FeedingTimeline";
import { FeedingForm } from "@/components/feeding/FeedingForm";
import type { FeedingTimelineItem } from "@/types";

type Tab = "mamadeira" | "peito" | "solidos";

const TABS: { value: Tab; label: string }[] = [
  { value: "mamadeira", label: "Mamadeira" },
  { value: "peito", label: "Peito" },
  { value: "solidos", label: "Sólidos" },
];

function parseTab(value: string | null): Tab | null {
  return TABS.some((t) => t.value === value) ? (value as Tab) : null;
}

function writeTipo(tab: Tab) {
  const url = new URL(window.location.href);
  url.searchParams.set("tipo", tab);
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

/**
 * Mamadeira / Peito / Sólidos. The tab lives in `?tipo=` (replaced, not
 * pushed). With no `tipo`, a feeding at the breast in progress opens Peito
 * and writes `tipo=peito`, so the tab stays on Peito after "Terminar mamada".
 */
function FeedingTabs() {
  const param = useSearchParams().get("tipo");
  const { activeBaby } = useBaby();
  const breastRunning = useActiveBreastTimer(activeBaby?.id) !== null;
  // The pick shows at once; once the URL carries it, the URL rules again.
  const [picked, setPicked] = useState<{ param: string | null; tab: Tab } | null>(null);
  const tab =
    picked && picked.param === param
      ? picked.tab
      : (parseTab(param) ?? (breastRunning ? "peito" : "mamadeira"));

  function select(next: Tab) {
    setPicked({ param, tab: next });
    writeTipo(next);
  }

  // A running feeding picked Peito with no `tipo`: hold it, so stopping the
  // feeding does not flip the tab back to Mamadeira, and put it in the URL.
  if (param === null && breastRunning && picked?.param !== param) {
    setPicked({ param, tab: "peito" });
  }
  const pinnedPeito = param === null && picked?.param === null && picked.tab === "peito";
  useEffect(() => {
    if (pinnedPeito) writeTipo("peito");
  }, [pinnedPeito]);

  return (
    <>
      <SegmentedControl
        size="sm"
        aria-label="Tipo de alimentação"
        value={tab}
        onChange={select}
        options={TABS}
        className="mt-1"
      />
      {tab === "mamadeira" && <BottleQuickLog />}
      {tab === "peito" && <BreastfeedingTimer />}
      {tab === "solidos" && <SolidFeedingLog />}
    </>
  );
}

function TabsFallback() {
  return (
    <div aria-busy="true" className="space-y-3">
      <Skeleton className="h-[56px] w-full rounded-full" />
      <Skeleton className="h-[260px] w-full rounded-[24px]" />
    </div>
  );
}

export default function FeedingPage() {
  const { isLoading } = useBaby();
  const deleteFeeding = useDeleteFeeding();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<FeedingTimelineItem | null>(null);

  if (isLoading) {
    return (
      <div aria-busy="true">
        <PageTitle>Comida</PageTitle>
        <div className="space-y-3">
          <Skeleton className="h-[136px] w-full rounded-[24px]" />
          <TabsFallback />
        </div>
      </div>
    );
  }

  function openForm(item: FeedingTimelineItem | null) {
    setEditItem(item);
    setShowForm(true);
  }

  return (
    <div>
      <PageTitle>Comida</PageTitle>

      <div className="flex flex-col gap-3">
        <FeedingSuggestionCard />

        <Suspense fallback={<TabsFallback />}>
          <FeedingTabs />
        </Suspense>

        <Button variant="ghost" className="mx-auto" onClick={() => openForm(null)}>
          <IconPen size={18} />
          Registrar mamada passada
        </Button>

        <FeedingTimeline onEdit={openForm} />
      </div>

      <FeedingForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditItem(null);
        }}
        item={editItem}
        onDelete={deleteFeeding}
      />
    </div>
  );
}
