"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
import { createClient } from "@/lib/supabase/client";
import { updateSleepSession } from "@/lib/supabase/queries";
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

    toast.success("Detalhes salvos ✨");
    queryClient.invalidateQueries({ queryKey: ["sleep-sessions"] });
    queryClient.invalidateQueries({ queryKey: ["last-session"] });
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Como foi o sono?</DialogTitle>
          <DialogDescription>
            Opcional — esses detalhes ajudam a IA a entender melhor o padrão do
            bebê.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Quality */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Qualidade do sono</p>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((q) => {
                const active = quality != null && q <= quality;
                return (
                  <motion.button
                    key={q}
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setQuality(q === quality ? null : q)}
                    aria-label={`${q} de 5 estrelas`}
                    aria-pressed={active}
                    className="rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Star
                      className={cn(
                        "h-7 w-7 transition-colors",
                        active
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40"
                      )}
                      aria-hidden="true"
                    />
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* How fell asleep */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Como adormeceu?</p>
            <div className="flex flex-wrap gap-2">
              {HOW_FELL_ASLEEP_OPTIONS.map((opt) => {
                const active = howFellAsleep === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setHowFellAsleep(active ? null : opt.value)
                    }
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "surface-soft text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span aria-hidden="true">{opt.emoji}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wake reason — night sleep only */}
          {isNight && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Por que acordou?</p>
              <div className="flex flex-wrap gap-2">
                {WAKE_REASON_OPTIONS.map((opt) => {
                  const active = wakeReason === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setWakeReason(active ? null : opt.value)
                      }
                      aria-pressed={active}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "surface-soft text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span aria-hidden="true">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="rounded-xl"
            >
              Pular
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl"
            >
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
