"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Leaf } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBaby } from "@/components/providers/BabyProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EnvironmentPicker, type EnvironmentData } from "./EnvironmentPicker";
import {
  HOW_FELL_ASLEEP_OPTIONS,
  WAKE_REASON_OPTIONS,
} from "@/lib/sleep/captureLabels";
import type { SleepSession } from "@/types";

/** Format a Date as YYYY-MM-DD using the browser's LOCAL timezone (not UTC). */
function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format a Date as HH:MM using the browser's LOCAL timezone. */
function toLocalTimeString(d: Date): string {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

const EMPTY_ENV: EnvironmentData = {
  room_temp_celsius: null,
  weather_condition: null,
  sleep_sack_type: null,
  sleep_sack_tog: null,
  clothing_description: null,
};

const formSchema = z.object({
  type: z.enum(["NAP", "NIGHT_SLEEP"]),
  start_date: z.string().min(1),
  start_time_input: z.string().min(1),
  end_date: z.string().min(1),
  end_time_input: z.string().min(1),
  quality: z.string().optional(),
  how_fell_asleep: z.string().optional(),
  wake_reason: z.string().optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SleepFormProps {
  open: boolean;
  onClose: () => void;
  session?: SleepSession | null;
}

export function SleepForm({ open, onClose, session }: SleepFormProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { activeBaby } = useBaby();
  const [envOpen, setEnvOpen] = useState(false);
  const [envData, setEnvData] = useState<EnvironmentData>(
    session
      ? {
          room_temp_celsius: session.room_temp_celsius ?? null,
          weather_condition: session.weather_condition ?? null,
          sleep_sack_type: session.sleep_sack_type ?? null,
          sleep_sack_tog: session.sleep_sack_tog ?? null,
          clothing_description: session.clothing_description ?? null,
        }
      : EMPTY_ENV
  );

  const isEdit = !!session;

  function buildFormValues(s?: SleepSession | null) {
    const start = s ? new Date(s.start_time) : new Date();
    const end = s?.end_time ? new Date(s.end_time) : new Date();
    return {
      type: (s?.type ?? "NAP") as "NAP" | "NIGHT_SLEEP",
      start_date: toLocalDateString(start),
      start_time_input: toLocalTimeString(start),
      end_date: toLocalDateString(end),
      end_time_input: toLocalTimeString(end),
      quality: s?.quality?.toString() ?? "",
      how_fell_asleep: s?.how_fell_asleep ?? "",
      wake_reason: s?.wake_reason ?? "",
      notes: s?.notes ?? "",
      location: s?.location ?? "",
    };
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: buildFormValues(session),
  });

  // Re-populate the form whenever the dialog opens or the session changes.
  // useForm's defaultValues are only applied on first mount, so we must
  // call reset() explicitly each time.
  useEffect(() => {
    if (open) {
      reset(buildFormValues(session));
      setEnvData(
        session
          ? {
              room_temp_celsius: session.room_temp_celsius ?? null,
              weather_condition: session.weather_condition ?? null,
              sleep_sack_type: session.sleep_sack_type ?? null,
              sleep_sack_tog: session.sleep_sack_tog ?? null,
              clothing_description: session.clothing_description ?? null,
            }
          : EMPTY_ENV
      );
      setEnvOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session?.id]);

  const selectedType = watch("type");

  // Count how many env fields are filled
  const envFilled = [
    envData.room_temp_celsius !== null,
    envData.weather_condition !== null,
    envData.sleep_sack_type !== null,
  ].filter(Boolean).length;

  async function onSubmit(data: FormData) {
    if (!activeBaby) return;

    const startTime = new Date(
      `${data.start_date}T${data.start_time_input}:00`
    ).toISOString();
    const endTime = new Date(
      `${data.end_date}T${data.end_time_input}:00`
    ).toISOString();

    const payload = {
      type: data.type,
      start_time: startTime,
      end_time: endTime,
      quality: data.quality ? parseInt(data.quality) : null,
      how_fell_asleep: data.how_fell_asleep || null,
      wake_reason: data.wake_reason || null,
      notes: data.notes || null,
      location: data.location || null,
      room_temp_celsius: envData.room_temp_celsius,
      weather_condition: envData.weather_condition,
      sleep_sack_type: envData.sleep_sack_type,
      sleep_sack_tog: envData.sleep_sack_tog,
      clothing_description: envData.clothing_description,
    };

    if (isEdit && session) {
      const { error } = await supabase
        .from("sleep_sessions")
        .update(payload)
        .eq("id", session.id);

      if (error) {
        toast.error("Erro ao atualizar registro");
        return;
      }
      toast.success("Registro atualizado");
    } else {
      const { error } = await supabase
        .from("sleep_sessions")
        .insert({ ...payload, baby_id: activeBaby.id });

      if (error) {
        toast.error("Erro ao criar registro");
        return;
      }
      toast.success("Sono registrado manualmente");
    }

    queryClient.invalidateQueries({ queryKey: ["sleep-sessions"] });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar registro" : "Registrar sono manualmente"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            value={selectedType}
            onValueChange={(v) =>
              setValue("type", v as "NAP" | "NIGHT_SLEEP")
            }
          >
            <SelectTrigger className="rounded-xl" aria-label="Tipo de sono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NAP">Soneca</SelectItem>
              <SelectItem value="NIGHT_SLEEP">Sono noturno</SelectItem>
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="start_date" className="text-xs text-muted-foreground">
                Data início
              </label>
              <Input
                id="start_date"
                type="date"
                {...register("start_date")}
                className="rounded-xl"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="start_time_input" className="text-xs text-muted-foreground">
                Hora início
              </label>
              <Input
                id="start_time_input"
                type="time"
                {...register("start_time_input")}
                className="rounded-xl"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="end_date" className="text-xs text-muted-foreground">
                Data fim
              </label>
              <Input
                id="end_date"
                type="date"
                {...register("end_date")}
                className="rounded-xl"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="end_time_input" className="text-xs text-muted-foreground">
                Hora fim
              </label>
              <Input
                id="end_time_input"
                type="time"
                {...register("end_time_input")}
                className="rounded-xl"
                autoComplete="off"
              />
            </div>
          </div>

          <Select
            value={watch("quality") ?? ""}
            onValueChange={(v) => v && setValue("quality", v)}
          >
            <SelectTrigger className="rounded-xl" aria-label="Qualidade do sono">
              <SelectValue placeholder="Qualidade (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((q) => (
                <SelectItem key={q} value={q.toString()}>
                  {"⭐".repeat(q)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={watch("how_fell_asleep") ?? ""}
            onValueChange={(v) => v && setValue("how_fell_asleep", v)}
          >
            <SelectTrigger className="rounded-xl" aria-label="Como adormeceu">
              <SelectValue placeholder="Como adormeceu? (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {HOW_FELL_ASLEEP_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.emoji} {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedType === "NIGHT_SLEEP" && (
            <Select
              value={watch("wake_reason") ?? ""}
              onValueChange={(v) => v && setValue("wake_reason", v)}
            >
              <SelectTrigger className="rounded-xl" aria-label="Motivo do despertar">
                <SelectValue placeholder="Por que acordou? (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {WAKE_REASON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.emoji} {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="space-y-1">
            <label htmlFor="location" className="sr-only">Local</label>
            <Input
              id="location"
              placeholder="Local (berço, braço, carrinho…)"
              {...register("location")}
              className="rounded-xl"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="notes" className="sr-only">Notas</label>
            <Textarea
              id="notes"
              placeholder="Notas (opcional)"
              {...register("notes")}
              className="rounded-xl resize-none"
              rows={2}
            />
          </div>

          {/* ── Environment section ── */}
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <button
              type="button"
              aria-expanded={envOpen}
              aria-controls="env-section"
              onClick={() => setEnvOpen(!envOpen)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setEnvOpen(!envOpen); }}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              style={{ touchAction: "manipulation" }}
            >
              <div className="flex items-center gap-2">
                <Leaf className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span className="text-sm font-medium">Condições do ambiente</span>
                {envFilled > 0 && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {envFilled} preenchido{envFilled > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <motion.div
                animate={{ rotate: envOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {envOpen && (
                <motion.div
                  id="env-section"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className={cn("overflow-hidden border-t border-border/40")}
                >
                  <div className="p-4">
                    <EnvironmentPicker value={envData} onChange={setEnvData} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="rounded-xl"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Salvando…"
                : isEdit
                  ? "Atualizar"
                  : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
