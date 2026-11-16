"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useBaby } from "@/components/providers/BabyProvider";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { IconX } from "@/components/brand/icons";
import { Input } from "@/components/ui/input";
import { DateTimeRangeFields } from "@/components/forms/DateTimeRangeFields";
import {
  useTimeRangeValidation,
  type TimeRangeNames,
} from "@/components/forms/useTimeRangeValidation";
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
import { END_BEFORE_START_MESSAGE, isEndBeforeStart, isCheckViolation } from "@/lib/validation/timeRange";
import {
  logBottleFeeding,
  updateBottleFeeding,
  logSolidFeeding,
  updateSolidFeeding,
  insertBreastfeedingSession,
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

const TYPE_OPTIONS: { value: FeedingType; label: string }[] = [
  { value: "BOTTLE", label: "Mamadeira" },
  { value: "BREAST", label: "Peito" },
  { value: "SOLID", label: "Sólidos" },
];

const REACTION_OPTIONS: { value: FoodReaction; label: string }[] = [
  { value: "LOVED", label: "Adorou" },
  { value: "LIKED", label: "Gostou" },
  { value: "NEUTRAL", label: "Neutro" },
  { value: "DISLIKED", label: "Não gostou" },
  { value: "ALLERGIC_REACTION", label: "Reação alérgica" },
];

const MILK_TYPE_ITEMS: Record<MilkType, string> = {
  FORMULA: "Fórmula",
  BREAST_MILK: "Leite materno",
  MIXED: "Misto",
};

/** Labels the closed select shows for each reaction value. */
const REACTION_ITEMS = Object.fromEntries(REACTION_OPTIONS.map((o) => [o.value, o.label]));

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

const RANGE_NAMES: TimeRangeNames<FormData> = {
  startDate: "start_date",
  startTime: "start_time_input",
  endDate: "end_date",
  endTime: "end_time_input",
};

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

interface FeedingFormProps {
  open: boolean;
  onClose: () => void;
  /** When set, edits this entry. When null, creates a new one (backdated log). */
  item?: FeedingTimelineItem | null;
  /** Deletes the edited entry; resolves true when it is gone. Shows "Excluir" when given. */
  onDelete?: (item: FeedingTimelineItem) => Promise<boolean>;
}

const LABEL = "font-sans text-sm font-bold text-sn-mu";
const FIELD = "h-11 rounded-xl border-sn-mu/70 px-3";

export function FeedingForm({ open, onClose, item, onDelete }: FeedingFormProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Editar alimentação" : "Registrar mamada passada"}</DialogTitle>
        </DialogHeader>

        {/* The popup's content mounts on every opening, so the form starts
            from `item` (or "now") each time without a reset effect. */}
        <FeedingFormBody onClose={onClose} item={item} onDelete={onDelete} />
      </DialogContent>
    </Dialog>
  );
}

function FeedingFormBody({ onClose, item, onDelete }: Omit<FeedingFormProps, "open">) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { activeBaby } = useBaby();

  const isEdit = !!item;
  const [type, setType] = useState<FeedingType>(item?.type ?? "BOTTLE");
  const [foodTags, setFoodTags] = useState<string[]>(
    item?.type === "SOLID" ? (item.raw as SolidFeeding).food_tags : []
  );
  const [customTag, setCustomTag] = useState("");
  // "Excluir" asks once more before deleting.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!item || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    const done = await onDelete(item);
    setDeleting(false);
    if (done) onClose();
  }

  const {
    register,
    handleSubmit,
    setValue,
    control,
    setError,
    clearErrors,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: buildFormValues(item),
  });

  useTimeRangeValidation(control, RANGE_NAMES, { clearErrors, enabled: type === "BREAST" });

  const [milkType, reaction] = useWatch({ control, name: ["milk_type", "reaction"] });

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
      if (endTime && isEndBeforeStart(startTime, endTime)) {
        setError("end_time_input", { type: "validate", message: END_BEFORE_START_MESSAGE });
        toast.error(END_BEFORE_START_MESSAGE);
        return;
      }
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
        if (error) return toast.error(isCheckViolation(error) ? END_BEFORE_START_MESSAGE : "Erro ao atualizar mamada");
        toast.success("Mamada atualizada");
      } else {
        const { data: created, error } = await insertBreastfeedingSession(
          supabase,
          activeBaby.id,
          {
            start_time: startTime,
            end_time: endTime ?? startTime,
            side_left_sec: sideLeftSec,
            side_right_sec: sideRightSec,
            last_side: sideLeftSec >= sideRightSec ? "LEFT" : "RIGHT",
            notes,
          }
        );
        if (error || !created) return toast.error(isCheckViolation(error) ? END_BEFORE_START_MESSAGE : "Erro ao registrar mamada");
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Type selector — locked while editing */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de alimentação">
        {TYPE_OPTIONS.map(({ value, label }) => (
          <Chip key={value} disabled={isEdit} selected={type === value} onClick={() => setType(value)}>
            {label}
          </Chip>
        ))}
      </div>

      <DateTimeRangeFields
        control={control}
        names={RANGE_NAMES}
        startLabels={type === "BREAST" ? undefined : { date: "Data", time: "Hora" }}
        showEnd={type === "BREAST"}
      />

      {type === "BREAST" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="side_left_min" className={LABEL}>
              Minutos no esquerdo
            </label>
            <Input id="side_left_min" type="number" min={0} {...register("side_left_min")} className={FIELD} autoComplete="off" />
          </div>
          <div className="space-y-1">
            <label htmlFor="side_right_min" className={LABEL}>
              Minutos no direito
            </label>
            <Input id="side_right_min" type="number" min={0} {...register("side_right_min")} className={FIELD} autoComplete="off" />
          </div>
        </div>
      )}

      {type === "BOTTLE" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="volume_ml" className={LABEL}>
              Quanto tomou (ml)
            </label>
            <Input id="volume_ml" type="number" min={1} {...register("volume_ml")} className={FIELD} autoComplete="off" />
          </div>
          <div className="space-y-1">
            <span className={LABEL}>Tipo de leite</span>
            <Select items={MILK_TYPE_ITEMS} value={milkType ?? "FORMULA"} onValueChange={(v) => v && setValue("milk_type", v)}>
              <SelectTrigger className="w-full rounded-xl data-[size=default]:h-11" aria-label="Tipo de leite">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MILK_TYPE_ITEMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
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
                <Chip key={tag} selected className="gap-1 py-1 pr-1">
                  {tag}
                  <button
                    type="button"
                    aria-label={`Remover ${tag}`}
                    onClick={() => toggleTag(tag)}
                    className="relative grid size-7 cursor-pointer place-items-center rounded-full outline-none transition-transform duration-(--sn-dur-micro) ease-sn-out after:absolute after:-inset-2 hover:bg-sn-pr-ink/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sn-pr-ink active:scale-[0.92] motion-reduce:transition-none"
                  >
                    <IconX size={16} />
                  </button>
                </Chip>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Alimentos">
            {COMMON_FOOD_TAGS.map((tag) => (
              <Chip key={tag} selected={foodTags.includes(tag)} onClick={() => toggleTag(tag)}>
                {tag}
              </Chip>
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
              aria-label="Outro alimento"
              autoComplete="off"
              className={FIELD}
            />
            <Button type="button" variant="secondary" size="sm" onClick={addCustomTag}>
              Adicionar
            </Button>
          </div>
          <Select items={REACTION_ITEMS} value={reaction ?? ""} onValueChange={(v) => v && setValue("reaction", v)}>
            <SelectTrigger className="w-full rounded-xl data-[size=default]:h-11" aria-label="Reação do bebê">
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
        <Input id="notes" placeholder="Notas (opcional)" {...register("notes")} className={FIELD} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {isEdit && onDelete && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            loading={deleting}
            disabled={isSubmitting}
            className="mr-auto"
          >
            {confirmDelete ? "Confirmar exclusão" : "Excluir"}
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" loading={isSubmitting} disabled={deleting}>
            {isEdit ? "Atualizar" : "Registrar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
