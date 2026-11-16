"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { createClient } from "@/lib/supabase/client";
import { updateSleepSession } from "@/lib/supabase/queries/sleep";
import {
  HOW_FELL_ASLEEP_OPTIONS,
  WAKE_REASON_OPTIONS,
} from "@/lib/sleep/captureLabels";
import { cn } from "@/lib/utils";
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
    queryClient.invalidateQueries({ queryKey: ["sleep-sessions"] });
    queryClient.invalidateQueries({ queryKey: ["last-session"] });
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto rounded-[24px] border-sn-bd bg-sn-s1">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px] font-bold">Como foi o sono?</DialogTitle>
          <DialogDescription>
            Opcional. Esses detalhes ajudam a IA a entender o padrão do bebê.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Quality */}
          <div className="space-y-2">
            <p className="font-sans text-sm font-bold text-sn-mu">Qualidade do sono</p>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((q) => {
                const active = quality != null && q <= quality;
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(q === quality ? null : q)}
                    aria-label={`${q} de 5 estrelas`}
                    aria-pressed={active}
                    className="grid size-11 cursor-pointer place-items-center rounded-full outline-none transition-transform duration-(--sn-dur-micro) ease-sn-out active:scale-90 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr"
                  >
                    <Star
                      className={cn(
                        "size-7",
                        active ? "fill-sn-pr text-sn-pr" : "text-sn-mu"
                      )}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* How fell asleep */}
          <div className="space-y-2">
            <p className="font-sans text-sm font-bold text-sn-mu">Como adormeceu?</p>
            <div className="flex flex-wrap gap-2">
              {HOW_FELL_ASLEEP_OPTIONS.map((opt) => {
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
                {WAKE_REASON_OPTIONS.map((opt) => {
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
