"use client";

import Link from "next/link";
import { SleepTimer } from "@/components/sleep/SleepTimer";
import { useUserProfile } from "@/components/providers/UserProfileProvider";
import { useBaby } from "@/components/providers/BabyProvider";
import { useFamilyActivityToasts } from "@/hooks/useFamilyActivityToasts";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { IconPlus } from "@/components/brand/icons";
import { SoninhoLogoMark } from "@/components/brand/SoninhoLogoMark";
import { BabySwitcher, HomeTopBar } from "@/components/home/HomeHeader";
import { TodayCard } from "@/components/home/TodayCard";
import { NannyNotesCard } from "@/components/home/NannyNotesCard";
import { RegressionNotice } from "@/components/home/RegressionNotice";

/** Home (spec §8.3, mockup home.html): awake with the next sleep, or the running sleep. */
export default function AppHomePage() {
  const { activeBaby, isLoading, babies } = useBaby();
  const { isNannyMode } = useUserProfile();
  // Toasts when another caregiver starts or stops a sleep.
  useFamilyActivityToasts(true);

  if (isLoading) {
    return (
      <div className="pt-5" aria-busy="true">
        <HomeTopBar />
        <div className="mb-4 flex items-center gap-3.5">
          <Skeleton className="size-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32 rounded-lg" />
            <Skeleton className="h-4 w-20 rounded-lg" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-[168px] w-full rounded-[24px]" />
          <Skeleton className="h-32 w-full rounded-[24px]" />
          <Skeleton className="h-14 w-full rounded-full" />
        </div>
      </div>
    );
  }

  if (babies.length === 0) {
    return (
      <div className="pt-5">
        <HomeTopBar />
        <div className="flex flex-col items-center gap-6 px-2 pt-14 text-center">
          <span className="grid size-24 place-items-center rounded-full border border-sn-bd bg-sn-s1">
            <SoninhoLogoMark size={56} />
          </span>
          <div className="space-y-2">
            <h1 className="font-display text-[28px] leading-tight font-bold">Bem-vindo ao Soninho</h1>
            <p className="max-w-xs text-base text-sn-mu">
              {isNannyMode
                ? "Ainda não há bebê na família. Peça a quem administra a família para adicionar o bebê."
                : "Adicione seu bebê para ver a previsão do próximo sono e registrar sonecas e noites."}
            </p>
          </div>
          {/* The babá cannot reach /more/babies (it redirects her home): no action for her. */}
          {!isNannyMode && (
            <Link href="/more/babies" className={buttonVariants({ variant: "primary" })}>
              <IconPlus size={22} />
              Adicionar bebê
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-5">
      <h1 className="sr-only">Início</h1>
      <HomeTopBar />
      <BabySwitcher />
      {/* key: a baby switch remounts the home's local UI state (sheets, back-date). */}
      <div key={activeBaby?.id} className="flex flex-col gap-3">
        <SleepTimer nanny={isNannyMode} />
        {isNannyMode && <NannyNotesCard />}
        <TodayCard nanny={isNannyMode} />
        {!isNannyMode && <RegressionNotice />}
      </div>
    </div>
  );
}
