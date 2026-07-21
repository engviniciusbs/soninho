"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, Milk } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { logBottleFeeding } from "@/lib/supabase/feedingQueries";
import { recordFeedingActivity } from "@/lib/family/recordFeedingActivity";
import { useBaby } from "@/components/providers/BabyProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MilkType } from "@/types";

const VOLUME_PRESETS = [60, 90, 120, 150, 180, 210];

const MILK_TYPE_OPTIONS: { value: MilkType; label: string }[] = [
  { value: "FORMULA", label: "Fórmula" },
  { value: "BREAST_MILK", label: "Leite ordenhado" },
  { value: "MIXED", label: "Misto" },
];

export function BottleQuickLog() {
  const { activeBaby } = useBaby();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [volume, setVolume] = useState(120);
  const [milkType, setMilkType] = useState<MilkType>("FORMULA");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!activeBaby) {
      toast.error("Adicione um bebê primeiro nas configurações");
      return;
    }
    setSubmitting(true);
    const { data, error } = await logBottleFeeding(supabase, activeBaby.id, {
      volume_ml: volume,
      milk_type: milkType,
    });
    setSubmitting(false);

    if (error || !data) {
      toast.error("Erro ao registrar mamadeira");
      return;
    }

    toast.success(`Mamadeira de ${volume}ml registrada 🍼`);
    queryClient.invalidateQueries({ queryKey: ["feeding-timeline"] });
    queryClient.invalidateQueries({ queryKey: ["feeding-suggestion"] });
    void recordFeedingActivity({
      babyId: activeBaby.id,
      babyName: activeBaby.name,
      action: "logged",
      feedingType: "BOTTLE",
      referenceId: data.id,
    });
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15">
        <Milk className="h-7 w-7 text-sky-400" aria-hidden="true" />
      </div>

      {/* Volume stepper */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Diminuir volume"
          onClick={() => setVolume((v) => Math.max(10, v - 10))}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-card/50 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          style={{ touchAction: "manipulation" }}
        >
          <Minus className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex flex-col items-center gap-0.5 min-w-[120px]">
          <span className="num-display text-4xl font-bold tabular-nums text-sky-400" aria-live="polite">
            {volume}
          </span>
          <span className="text-xs text-muted-foreground">ml</span>
        </div>

        <button
          type="button"
          aria-label="Aumentar volume"
          onClick={() => setVolume((v) => Math.min(500, v + 10))}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-card/50 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          style={{ touchAction: "manipulation" }}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Volume presets */}
      <div className="flex gap-1.5 flex-wrap justify-center">
        {VOLUME_PRESETS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={volume === v}
            onClick={() => setVolume(v)}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              volume === v
                ? "bg-sky-500 text-white"
                : "border border-border/60 bg-card/40 text-muted-foreground hover:border-sky-500/40 hover:text-foreground"
            )}
            style={{ touchAction: "manipulation" }}
          >
            {v}ml
          </button>
        ))}
      </div>

      {/* Milk type */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-sm" role="group" aria-label="Tipo de leite">
        {MILK_TYPE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={milkType === value}
            onClick={() => setMilkType(value)}
            className={cn(
              "rounded-xl border py-2.5 px-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              milkType === value
                ? "border-sky-500/50 bg-sky-500/10 text-sky-400"
                : "border-border/50 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground"
            )}
            style={{ touchAction: "manipulation" }}
          >
            {label}
          </button>
        ))}
      </div>

      <motion.div whileTap={{ scale: 0.97 }} className="w-full max-w-sm">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-11 rounded-2xl bg-sky-500 text-white hover:bg-sky-500/90"
        >
          {submitting ? "Registrando…" : "Registrar mamadeira"}
        </Button>
      </motion.div>
    </div>
  );
}
