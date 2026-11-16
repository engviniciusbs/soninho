"use client";

import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { StarRating } from "@/components/ui/star-rating";
import { createClient } from "@/lib/supabase/client";
import { updateSleepSession } from "@/lib/supabase/queries/sleep";
import { invalidateSleepQueries } from "@/lib/query/invalidateSleep";
import { howFellAsleepOptions, wakeReasonOptions } from "@/lib/sleep/captureLabels";
import { useBaby } from "@/components/providers/BabyProvider";
import { toast } from "sonner";
import type { HowFellAsleep, WakeReason } from "@/types";

interface PostSleepReviewProps {
  sessionId: string | null;
  sleepType: "NAP" | "NIGHT_SLEEP";
  open: boolean;
  onClose: () => void;
}

export function PostSleepReview({
  sessionId,
  sleepType,
  open,
  onClose,
}: PostSleepReviewProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { activeBaby } = useBaby();
  const sex = activeBaby?.sex;
  const qualityLabelId = useId();

  const [quality, setQuality] = useState<number | null>(null);
  const [howFellAsleep, setHowFellAsleep] = useState<HowFellAsleep | null>(null);
  const [wakeReason, setWakeReason] = useState<WakeReason | null>(null);
  const [saving, setSaving] = useState(false);

  const isNight = sleepType === "NIGHT_SLEEP";

  function reset() {
    setQuality(null);
    setHowFellAsleep(null);
    setWakeReason(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSave() {
    if (!sessionId) {
      handleClose();
      return;
    }
    // Nothing selected → behave like skip
    if (quality === null && howFellAsleep === null && wakeReason === null) {
      handleClose();
      return;
    }

    setSaving(true);
    const { error } = await updateSleepSession(supabase, sessionId, {
      quality,
      how_fell_asleep: howFellAsleep,
      wake_reason: isNight ? wakeReason : null,
    });
    setSaving(false);

    if (error) {
      toast.error("Não foi possível salvar os detalhes");
      return;
    }

    toast.success("Detalhes salvos");
    if (activeBaby) void invalidateSleepQueries(queryClient, activeBaby.id);
    else void queryClient.invalidateQueries({ queryKey: ["sleep-sessions"] });
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Como foi o sono?</DialogTitle>
          <DialogDescription>
            Opcional. Esses detalhes ajudam a IA a entender o padrão do bebê.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Quality */}
          <div className="space-y-2">
            <p id={qualityLabelId} className="font-sans text-sm font-bold text-sn-mu">
              Qualidade do sono
            </p>
            <StarRating
              label="Qualidade do sono"
              labelledBy={qualityLabelId}
              value={quality}
              onChange={setQuality}
            />
          </div>

          {/* How fell asleep */}
          <div className="space-y-2">
            <p className="font-sans text-sm font-bold text-sn-mu">Como adormeceu?</p>
            <div className="flex flex-wrap gap-2">
              {howFellAsleepOptions(sex).map((opt) => {
                const active = howFellAsleep === opt.value;
                return (
                  <Chip
                    key={opt.value}
                    selected={active}
                    onClick={() => setHowFellAsleep(active ? null : opt.value)}
                  >
                    {opt.label}
                  </Chip>
                );
              })}
            </div>
          </div>

          {/* Wake reason — night sleep only */}
          {isNight && (
            <div className="space-y-2">
              <p className="font-sans text-sm font-bold text-sn-mu">Por que acordou?</p>
              <div className="flex flex-wrap gap-2">
                {wakeReasonOptions(sex).map((opt) => {
                  const active = wakeReason === opt.value;
                  return (
                    <Chip
                      key={opt.value}
                      selected={active}
                      onClick={() => setWakeReason(active ? null : opt.value)}
                    >
                      {opt.label}
                    </Chip>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={handleClose}
            >
              Pular
            </Button>
            <Button
              type="button"
              size="md"
              onClick={handleSave}
              loading={saving}
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
