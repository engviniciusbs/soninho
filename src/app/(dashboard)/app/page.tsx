"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { SleepTimer } from "@/components/sleep/SleepTimer";
import { WakeWindowBadge } from "@/components/sleep/WakeWindowBadge";
import { AISuggestionCard } from "@/components/ai/AISuggestionCard";
import { RegressionRadar } from "@/components/sleep/RegressionRadar";
import { FamilyNoteCard } from "@/components/family/FamilyNoteCard";
import { FamilyActivityFeed } from "@/components/family/FamilyActivityFeed";
import { useUserProfile } from "@/components/providers/UserProfileProvider";
import { useFamilyActivityToasts } from "@/hooks/useFamilyActivityToasts";
import { SleepTimeline } from "@/components/sleep/SleepTimeline";
import { useBaby } from "@/components/providers/BabyProvider";
import { BabyAvatar } from "@/components/baby/BabyAvatar";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Baby } from "lucide-react";
import { SoninhoLogoMark } from "@/components/brand/SoninhoLogoMark";
import { getBabyAge } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function ageLabel(birthDate: string): string {
  const { weeks, months } = getBabyAge(birthDate);
  if (months >= 1) return `${months} ${months === 1 ? "mês" : "meses"}`;
  return `${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
}

export default function AppHomePage() {
  const { activeBaby, isLoading, babies } = useBaby();
  const { isNannyMode } = useUserProfile();
  useFamilyActivityToasts(true);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40 rounded-lg" />
            <Skeleton className="h-4 w-24 rounded-lg" />
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Skeleton className="h-[360px] w-full rounded-3xl" />
          <div className="space-y-5">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (babies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-7 pt-20 text-center px-6">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex h-24 w-24 items-center justify-center rounded-full surface"
        >
          <SoninhoLogoMark size={64} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="space-y-3"
        >
          <h1 className="font-display text-2xl font-semibold">
            Bem-vindo ao Soninho
          </h1>
          <p className="text-muted-foreground max-w-xs leading-relaxed">
            Adicione seu bebê para começar a monitorar o sono e receber dicas
            personalizadas.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/settings">
            <Button size="lg" className="rounded-full px-8">
              <Baby className="mr-2 h-4 w-4" aria-hidden="true" />
              Adicionar bebê
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item}>
        <PageHeader
          leading={
            <BabyAvatar
              avatarUrl={activeBaby?.avatar_url}
              emoji={activeBaby?.avatar_emoji ?? "🌙"}
              name={activeBaby?.name}
              size="md"
            />
          }
          eyebrow="Acompanhamento"
          title={activeBaby?.name ?? "Bebê"}
          subtitle={activeBaby ? ageLabel(activeBaby.birth_date) : undefined}
        />
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
        {/* Timer — primary action */}
        <motion.div variants={item} className="rounded-3xl surface p-5 sm:p-7">
          <SleepTimer />
        </motion.div>

        {/* Live status + insights (modo babá: só mural e atividade) */}
        <div className="space-y-5">
          {!isNannyMode && (
            <>
              <motion.div variants={item}>
                <WakeWindowBadge />
              </motion.div>
              <motion.div variants={item}>
                <AISuggestionCard />
              </motion.div>
              <motion.div variants={item}>
                <RegressionRadar />
              </motion.div>
            </>
          )}
          <motion.div variants={item}>
            <FamilyNoteCard />
          </motion.div>
          <motion.div variants={item}>
            <FamilyActivityFeed />
          </motion.div>
          {!isNannyMode && (
            <motion.div variants={item}>
              <SleepTimeline />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
