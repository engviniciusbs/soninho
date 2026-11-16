"use client";

import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toastNoBaby } from "@/lib/toasts/noBaby";
import { createClient } from "@/lib/supabase/client";
import { logBottleFeeding } from "@/lib/supabase/feedingQueries";
import { recordFeedingActivity } from "@/lib/family/recordFeedingActivity";
import { useBaby } from "@/components/providers/BabyProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { IconMinus, IconPlus } from "@/components/brand/icons";
import type { MilkType } from "@/types";

const STEP = 10;
const MAX_ML = 500;

const MILK_TYPE_OPTIONS: { value: MilkType; label: string }[] = [
  { value: "FORMULA", label: "Fórmula" },
  { value: "BREAST_MILK", label: "Leite materno" },
  { value: "MIXED", label: "Misto" },
];

const STEPPER_BUTTON =
  "size-[52px] border-[1.5px] border-sn-bd text-sn-tx hover:bg-sn-s2";

/** Bottle quick log (mockup "Quanto tomou"): ml stepper, milk type chips, register. */
export function BottleQuickLog() {
  const labelId = useId();
  const { activeBaby } = useBaby();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [volume, setVolume] = useState(120);
  const [milkType, setMilkType] = useState<MilkType>("FORMULA");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!activeBaby) {
      toastNoBaby();
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

    toast.success(`Mamadeira de ${volume} ml registrada`);
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
    <Card role="region" aria-labelledby={labelId} className="gap-0 px-[18px]">
      <p id={labelId} className="font-sans text-sm font-bold text-sn-mu">
        Quanto tomou
      </p>

      <div className="my-3.5 flex items-center justify-between">
        <Button
          variant="icon"
          aria-label="Diminuir 10 ml"
          className={STEPPER_BUTTON}
          disabled={volume <= 0}
          onClick={() => setVolume((v) => Math.max(0, v - STEP))}
        >
          <IconMinus size={22} />
        </Button>
        <span
          data-testid="bottle-volume"
          aria-live="polite"
          className="font-display text-[44px] leading-none font-bold text-sn-tx tabular-nums"
        >
          {volume}
          <small className="ml-1 font-sans text-base font-bold text-sn-mu">ml</small>
        </span>
        <Button
          variant="icon"
          aria-label="Aumentar 10 ml"
          className={STEPPER_BUTTON}
          disabled={volume >= MAX_ML}
          onClick={() => setVolume((v) => Math.min(MAX_ML, v + STEP))}
        >
          <IconPlus size={22} />
        </Button>
      </div>

      <div role="group" aria-label="Tipo de leite" className="flex flex-wrap gap-2">
        {MILK_TYPE_OPTIONS.map(({ value, label }) => (
          <Chip key={value} selected={milkType === value} onClick={() => setMilkType(value)}>
            {label}
          </Chip>
        ))}
      </div>

      <Button
        className="mt-3.5 w-full"
        onClick={handleSubmit}
        loading={submitting}
        // The database only takes volumes above zero.
        disabled={volume <= 0}
      >
        Registrar mamadeira
      </Button>
    </Card>
  );
}
