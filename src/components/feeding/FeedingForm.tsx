"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Milk, Baby, Salad } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBaby } from "@/components/providers/BabyProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  logBottleFeeding,
  updateBottleFeeding,
  logSolidFeeding,
  updateSolidFeeding,
  startBreastfeedingSession,
  updateBreastfeedingSession,
} from "@/lib/supabase/feedingQueries";
import { recordFeedingActivity } from "@/lib/family/recordFeedingActivity";
import { COMMON_FOOD_TAGS } from "@/lib/feeding/foodTags";
import type {
  FeedingType,
  FeedingTimelineItem,
  BottleFeeding,
  BreastfeedingSession,
  SolidFeeding,
  MilkType,
  FoodReaction,
} from "@/types";

function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalTimeString(d: Date): string {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

const TYPE_OPTIONS: { value: FeedingType; label: string; icon: typeof Milk }[] = [
  { value: "BOTTLE", label: "Mamadeira", icon: Milk },
  { value: "BREAST", label: "Peito", icon: Baby },
  { value: "SOLID", label: "Sólidos", icon: Salad },
];

const REACTION_OPTIONS: { value: FoodReaction; label: string }[] = [
  { value: "LOVED", label: "😍 Adorou" },
  { value: "LIKED", label: "🙂 Gostou" },
  { value: "NEUTRAL", label: "😐 Neutro" },
  { value: "DISLIKED", label: "😖 Não gostou" },
  { value: "ALLERGIC_REACTION", label: "⚠️ Reação alérgica" },
];

const formSchema = z.object({
  start_date: z.string().min(1),
  start_time_input: z.string().min(1),
  end_date: z.string().optional(),
  end_time_input: z.string().optional(),
  volume_ml: z.string().optional(),
  milk_type: z.string().optional(),
  side_left_min: z.string().optional(),
  side_right_min: z.string().optional(),
  reaction: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FeedingFormProps {
  open: boolean;
  onClose: () => void;
  /** When set, edits this entry. When null, creates a new one (backdated log). */
  item?: FeedingTimelineItem | null;
}

export function FeedingForm({ open, onClose, item }: FeedingFormProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { activeBaby } = useBaby();

  const isEdit = !!item;
  const [type, setType] = useState<FeedingType>(item?.type ?? "BOTTLE");
  const [foodTags, setFoodTags] = useState<string[]>(
    item?.type === "SOLID" ? (item.raw as SolidFeeding).food_tags : []
  );
  const [customTag, setCustomTag] = useState("");

  function buildFormValues(current?: FeedingTimelineItem | null): FormData {
    const start = current ? new Date(current.startTime) : new Date();
    const end = current?.endTime ? new Date(current.endTime) : new Date();

    const bottle = current?.type === "BOTTLE" ? (current.raw as BottleFeeding) : null;
    const breast = current?.type === "BREAST" ? (current.raw as BreastfeedingSession) : null;
    const solid = current?.type === "SOLID" ? (current.raw as SolidFeeding) : null;

    return {
      start_date: toLocalDateString(start),
      start_time_input: toLocalTimeString(start),
      end_date: toLocalDateString(end),
      end_time_input: toLocalTimeString(end),
      volume_ml: bottle?.volume_ml?.toString() ?? "120",
      milk_type: bottle?.milk_type ?? "FORMULA",
      side_left_min: breast ? Math.round(breast.side_left_sec / 60).toString() : "0",
      side_right_min: breast ? Math.round(breast.side_right_sec / 60).toString() : "0",
      reaction: solid?.reaction ?? "",
      notes: bottle?.notes ?? breast?.notes ?? solid?.notes ?? "",
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
    defaultValues: buildFormValues(item),
  });

  useEffect(() => {
    if (open) {
      reset(buildFormValues(item));
      setType(item?.type ?? "BOTTLE");
      setFoodTags(item?.type === "SOLID" ? (item.raw as SolidFeeding).food_tags : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  function toggleTag(tag: string) {
    setFoodTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function addCustomTag() {
    const trimmed = customTag.trim();
    if (!trimmed || foodTags.includes(trimmed)) return;
    setFoodTags((prev) => [...prev, trimmed]);
    setCustomTag("");
  }

  async function onSubmit(data: FormData) {
    if (!activeBaby) return;

    const startTime = new Date(`${data.start_date}T${data.start_time_input}:00`).toISOString();
    const notes = data.notes || null;

    if (type === "BOTTLE") {
      const payload = {
        volume_ml: parseInt(data.volume_ml || "0", 10) || 0,
        milk_type: (data.milk_type || "FORMULA") as MilkType,
        start_time: startTime,
        notes,
      };
      if (isEdit && item) {
        const { error } = await updateBottleFeeding(supabase, item.id, payload);
        if (error) return toast.error("Erro ao atualizar mamadeira");
        toast.success("Mamadeira atualizada");
      } else {
        const { data: created, error } = await logBottleFeeding(supabase, activeBaby.id, payload);
        if (error || !created) return toast.error("Erro ao registrar mamadeira");
        toast.success("Mamadeira registrada");
        void recordFeedingActivity({
          babyId: activeBaby.id,
          babyName: activeBaby.name,
          action: "logged",
          feedingType: "BOTTLE",
          referenceId: created.id,
        });
      }
    } else if (type === "BREAST") {
      const endTime =
        data.end_date && data.end_time_input
          ? new Date(`${data.end_date}T${data.end_time_input}:00`).toISOString()
          : null;
      const sideLeftSec = (parseInt(data.side_left_min || "0", 10) || 0) * 60;
      const sideRightSec = (parseInt(data.side_right_min || "0", 10) || 0) * 60;

      if (isEdit && item) {
        const { error } = await updateBreastfeedingSession(supabase, item.id, {
          start_time: startTime,
          end_time: endTime,
          side_left_sec: sideLeftSec,
          side_right_sec: sideRightSec,
          notes,
        });
        if (error) return toast.error("Erro ao atualizar mamada");
        toast.success("Mamada atualizada");
      } else {
        const { data: created, error } = await startBreastfeedingSession(
          supabase,
          activeBaby.id,
          sideLeftSec >= sideRightSec ? "LEFT" : "RIGHT",
          startTime
        );
        if (error || !created) return toast.error("Erro ao registrar mamada");
        const { error: updateError } = await updateBreastfeedingSession(supabase, created.id, {
          end_time: endTime ?? startTime,
          side_left_sec: sideLeftSec,
          side_right_sec: sideRightSec,
          notes,
        });
        if (updateError) return toast.error("Erro ao registrar mamada");
        toast.success("Mamada registrada");
        void recordFeedingActivity({
          babyId: activeBaby.id,
          babyName: activeBaby.name,
          action: "logged",
          feedingType: "BREAST",
          referenceId: created.id,
        });
      }
    } else {
      if (foodTags.length === 0) return toast.error("Selecione ao menos um alimento");
      const payload = {
        food_tags: foodTags,
        reaction: (data.reaction || null) as FoodReaction | null,
        start_time: startTime,
        notes,
      };
      if (isEdit && item) {
        const { error } = await updateSolidFeeding(supabase, item.id, payload);
        if (error) return toast.error("Erro ao atualizar refeição");
        toast.success("Refeição atualizada");
      } else {
        const { data: created, error } = await logSolidFeeding(supabase, activeBaby.id, payload);
        if (error || !created) return toast.error("Erro ao registrar refeição");
        toast.success("Refeição registrada");
        void recordFeedingActivity({
          babyId: activeBaby.id,
          babyName: activeBaby.name,
          action: "logged",
          feedingType: "SOLID",
          referenceId: created.id,
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["feeding-timeline"] });
    queryClient.invalidateQueries({ queryKey: ["feeding-suggestion"] });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar registro" : "Registrar alimentação esquecida"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type selector — locked while editing */}
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Tipo de alimentação">
            {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                disabled={isEdit}
                aria-pressed={type === value}
                onClick={() => setType(value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border py-2.5 px-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                  type === value
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/50 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground"
                )}
                style={{ touchAction: "manipulation" }}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          {/* Start date/time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="start_date" className="text-xs text-muted-foreground">
                {type === "BREAST" ? "Data início" : "Data"}
              </label>
              <Input id="start_date" type="date" {...register("start_date")} className="rounded-xl" autoComplete="off" />
            </div>
            <div className="space-y-1">
              <label htmlFor="start_time_input" className="text-xs text-muted-foreground">
                {type === "BREAST" ? "Hora início" : "Hora"}
              </label>
              <Input id="start_time_input" type="time" {...register("start_time_input")} className="rounded-xl" autoComplete="off" />
            </div>
          </div>

          {type === "BREAST" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="end_date" className="text-xs text-muted-foreground">
                    Data fim
                  </label>
                  <Input id="end_date" type="date" {...register("end_date")} className="rounded-xl" autoComplete="off" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="end_time_input" className="text-xs text-muted-foreground">
                    Hora fim
                  </label>
                  <Input id="end_time_input" type="time" {...register("end_time_input")} className="rounded-xl" autoComplete="off" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="side_left_min" className="text-xs text-muted-foreground">
                    Minutos (Esq.)
                  </label>
                  <Input id="side_left_min" type="number" min={0} {...register("side_left_min")} className="rounded-xl" autoComplete="off" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="side_right_min" className="text-xs text-muted-foreground">
                    Minutos (Dir.)
                  </label>
                  <Input id="side_right_min" type="number" min={0} {...register("side_right_min")} className="rounded-xl" autoComplete="off" />
                </div>
              </div>
            </>
          )}

          {type === "BOTTLE" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="volume_ml" className="text-xs text-muted-foreground">
                  Volume (ml)
                </label>
                <Input id="volume_ml" type="number" min={1} {...register("volume_ml")} className="rounded-xl" autoComplete="off" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tipo de leite</label>
                <Select value={watch("milk_type") ?? "FORMULA"} onValueChange={(v) => v && setValue("milk_type", v)}>
                  <SelectTrigger className="rounded-xl" aria-label="Tipo de leite">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FORMULA">Fórmula</SelectItem>
                    <SelectItem value="BREAST_MILK">Leite ordenhado</SelectItem>
                    <SelectItem value="MIXED">Misto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {type === "SOLID" && (
            <div className="space-y-3">
              {foodTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {foodTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-400"
                    >
                      {tag} ✕
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-3 gap-1.5">
                {COMMON_FOOD_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={foodTags.includes(tag)}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "rounded-lg border py-1.5 px-1.5 text-[11px] font-medium transition-all",
                      foodTags.includes(tag)
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                        : "border-border/50 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTag();
                    }
                  }}
                  placeholder="Outro alimento…"
                  className="rounded-xl"
                />
                <Button type="button" variant="outline" onClick={addCustomTag} className="rounded-xl shrink-0">
                  Adicionar
                </Button>
              </div>
              <Select value={watch("reaction") ?? ""} onValueChange={(v) => v && setValue("reaction", v)}>
                <SelectTrigger className="rounded-xl" aria-label="Reação do bebê">
                  <SelectValue placeholder="Reação do bebê (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {REACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="notes" className="sr-only">Notas</label>
            <Input id="notes" placeholder="Notas (opcional)" {...register("notes")} className="rounded-xl" autoComplete="off" />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" className="rounded-xl" disabled={isSubmitting}>
              {isSubmitting ? "Salvando…" : isEdit ? "Atualizar" : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
