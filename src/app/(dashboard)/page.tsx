"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { SleepTimer } from "@/components/sleep/SleepTimer";
import { WakeWindowBadge } from "@/components/sleep/WakeWindowBadge";
import { AISuggestionCard } from "@/components/ai/AISuggestionCard";
import { SleepTimeline } from "@/components/sleep/SleepTimeline";
import { useBaby } from "@/components/providers/BabyProvider";
import { BabyAvatar } from "@/components/baby/BabyAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Moon, Baby } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const { activeBaby, isLoading, babies } = useBaby();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-6 pt-10 px-4">
        <Skeleton className="h-7 w-36 rounded-full" />
        <Skeleton className="h-[300px] w-full max-w-sm rounded-3xl" />
        <Skeleton className="h-24 w-full max-w-sm rounded-2xl" />
        <Skeleton className="h-32 w-full max-w-sm rounded-2xl" />
      </div>
    );
  }

  if (babies.length === 0) {
    return (
      <div className="relative flex flex-col items-center justify-center gap-8 pt-20 text-center px-6">
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute left-1/2 top-1/4 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 animate-float"
        >
          <Moon className="h-12 w-12 text-primary animate-breathe" aria-hidden="true" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          <h2 className="text-2xl font-bold">Bem-vindo ao Soninho!</h2>
          <p className="text-muted-foreground max-w-xs leading-relaxed">
            Adicione seu bebê para começar a monitorar o sono e receber dicas personalizadas.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Link href="/settings">
            <Button size="lg" className="rounded-full px-8 glow-primary">
              <Baby className="mr-2 h-4 w-4" aria-hidden="true" />
              Adicionar bebê
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      {/* Ambient background orbs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-60 w-60 rounded-full bg-indigo/6 blur-3xl" />
        <div className="absolute bottom-1/3 -left-20 h-60 w-60 rounded-full bg-lavender/5 blur-3xl" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative flex flex-col items-center gap-5 pt-4 pb-8 px-4"
      >
        {/* Baby greeting */}
        <motion.div variants={item} className="flex flex-col items-center gap-2">
          <BabyAvatar
            avatarUrl={activeBaby?.avatar_url}
            emoji={activeBaby?.avatar_emoji ?? "🌙"}
            name={activeBaby?.name}
            size="lg"
          />
          <h1 className="text-xl font-bold text-foreground">{activeBaby?.name}</h1>
        </motion.div>

        {/* Timer card */}
        <motion.div variants={item} className="w-full max-w-sm">
          <div className="glass rounded-3xl border border-white/8 p-5 sm:p-8 shadow-2xl">
            <SleepTimer />
          </div>
        </motion.div>

        {/* Info widgets */}
        <motion.div variants={item} className="w-full max-w-sm">
          <WakeWindowBadge />
        </motion.div>

        <motion.div variants={item} className="w-full max-w-sm">
          <AISuggestionCard />
        </motion.div>

        <motion.div variants={item} className="w-full max-w-sm">
          <SleepTimeline />
        </motion.div>
      </motion.div>
    </div>
  );
}
