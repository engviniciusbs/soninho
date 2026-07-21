"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Milk, Baby, Salad, ClipboardPlus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { BabyAvatar } from "@/components/baby/BabyAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useBaby } from "@/components/providers/BabyProvider";
import { BottleQuickLog } from "@/components/feeding/BottleQuickLog";
import { BreastfeedingTimer } from "@/components/feeding/BreastfeedingTimer";
import { SolidFeedingLog } from "@/components/feeding/SolidFeedingLog";
import { FeedingSuggestionCard } from "@/components/feeding/FeedingSuggestionCard";
import { FeedingTimeline } from "@/components/feeding/FeedingTimeline";
import { FeedingForm } from "@/components/feeding/FeedingForm";
import type { FeedingTimelineItem } from "@/types";

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function FeedingPage() {
  const { activeBaby, isLoading } = useBaby();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<FeedingTimelineItem | null>(null);

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
        <Skeleton className="h-[360px] w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <PageHeader
          leading={
            <BabyAvatar
              avatarUrl={activeBaby?.avatar_url}
              emoji={activeBaby?.avatar_emoji ?? "🍼"}
              name={activeBaby?.name}
              size="md"
            />
          }
          eyebrow="Alimentação"
          title="Mamadeiras, peito e sólidos"
          subtitle={activeBaby ? `Registro de ${activeBaby.name}` : undefined}
          actions={
            <Button
              variant="outline"
              onClick={() => {
                setEditItem(null);
                setShowForm(true);
              }}
              className="rounded-full gap-2 px-4"
            >
              <ClipboardPlus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Registrar esquecida</span>
              <span className="sm:hidden">Esquecida</span>
            </Button>
          }
        />
      </motion.div>

      <motion.div variants={item}>
        <FeedingSuggestionCard />
      </motion.div>

      <motion.div variants={item} className="rounded-3xl surface p-5 sm:p-7">
        <Tabs defaultValue="bottle">
          <TabsList className="w-full grid grid-cols-3 h-10">
            <TabsTrigger value="bottle" className="gap-1.5">
              <Milk className="h-4 w-4" aria-hidden="true" />
              Mamadeira
            </TabsTrigger>
            <TabsTrigger value="breast" className="gap-1.5">
              <Baby className="h-4 w-4" aria-hidden="true" />
              Peito
            </TabsTrigger>
            <TabsTrigger value="solid" className="gap-1.5">
              <Salad className="h-4 w-4" aria-hidden="true" />
              Sólidos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="bottle">
            <BottleQuickLog />
          </TabsContent>
          <TabsContent value="breast">
            <BreastfeedingTimer />
          </TabsContent>
          <TabsContent value="solid">
            <SolidFeedingLog />
          </TabsContent>
        </Tabs>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Últimos registros
        </h2>
        <FeedingTimeline
          onEdit={(item) => {
            setEditItem(item);
            setShowForm(true);
          }}
        />
      </motion.div>

      <FeedingForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditItem(null);
        }}
        item={editItem}
      />
    </motion.div>
  );
}
