"use client";

import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useBaby } from "@/components/providers/BabyProvider";
import { Button } from "@/components/ui/button";
import { IconChevronDown, IconLeaf } from "@/components/brand/icons";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StarRating } from "@/components/ui/star-rating";
import { DateTimeRangeFields } from "@/components/forms/DateTimeRangeFields";
import {
  useTimeRangeValidation,
  type TimeRangeNames,
} from "@/components/forms/useTimeRangeValidation";
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
import { END_BEFORE_START_MESSAGE, isEndBeforeStart, isCheckViolation } from "@/lib/validation/timeRange";
import { cn } from "@/lib/utils";
import { deleteSleepSession } from "@/lib/supabase/queries/sleep";
import { invalidateSleepQueries } from "@/lib/query/invalidateSleep";
import { EnvironmentPicker, type EnvironmentData } from "./EnvironmentPicker";
import {
  howFellAsleepOptions,
  howFellAsleepLabels,
  wakeReasonOptions,
  wakeReasonLabels,
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
});

type FormData = z.infer<typeof formSchema>;

const RANGE_NAMES: TimeRangeNames<FormData> = {
  startDate: "start_date",
  startTime: "start_time_input",
  endDate: "end_date",
  endTime: "end_time_input",
};

function envFromSession(s?: SleepSession | null): EnvironmentData {
  return s
    ? {
        room_temp_celsius: s.room_temp_celsius ?? null,
        weather_condition: s.weather_condition ?? null,
        sleep_sack_type: s.sleep_sack_type ?? null,
        sleep_sack_tog: s.sleep_sack_tog ?? null,
        clothing_description: s.clothing_description ?? null,
      }
    : EMPTY_ENV;
}

const TYPE_OPTIONS: { value: "NAP" | "NIGHT_SLEEP"; label: string }[] = [
  { value: "NAP", label: "Soneca" },
  { value: "NIGHT_SLEEP", label: "Noturno" },
];

/** First item of every optional select: picking it clears the answer. */
const CLEAR_VALUE = "none";
const CLEAR_LABEL = "Não informar";

/** Select value → form value: the clear item stores "" (saved as null). */
const fromSelect = (v: string | null) => (!v || v === CLEAR_VALUE ? "" : v);

function buildFormValues(s?: SleepSession | null, day?: string): FormData {
  const start = s ? new Date(s.start_time) : new Date();
  const end = s?.end_time ? new Date(s.end_time) : new Date();
  // A new sleep logged from a past day starts on that day.
  const newDay = !s && day ? day : null;
  return {
    type: (s?.type ?? "NAP") as "NAP" | "NIGHT_SLEEP",
    start_date: newDay ?? toLocalDateString(start),
    start_time_input: toLocalTimeString(start),
    end_date: newDay ?? toLocalDateString(end),
    end_time_input: toLocalTimeString(end),
    quality: s?.quality?.toString() ?? "",
    how_fell_asleep: s?.how_fell_asleep ?? "",
    wake_reason: s?.wake_reason ?? "",
    notes: s?.notes ?? "",
  };
}

interface SleepFormProps {
  open: boolean;
  onClose: () => void;
  session?: SleepSession | null;
  /** Day (yyyy-MM-dd) a new sleep starts on; today when absent. */
  day?: string;
}

const LABEL = "font-sans text-sm font-bold text-sn-mu";
const TRIGGER = "w-full rounded-xl data-[size=default]:h-11";

export function SleepForm({ open, onClose, session, day }: SleepFormProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{session ? "Editar sono" : "Registrar sono passado"}</DialogTitle>
        </DialogHeader>

        {/* The popup's content mounts on every opening, so the form starts
            from `session` (or "now") each time without a reset effect. */}
        <SleepFormBody onClose={onClose} session={session} day={day} />
      </DialogContent>
    </Dialog>
  );
}

function SleepFormBody({ onClose, session, day }: Omit<SleepFormProps, "open">) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { activeBaby } = useBaby();
  const sex = activeBaby?.sex;
  const qualityLabelId = useId();
  const [envOpen, setEnvOpen] = useState(false);
  const [envData, setEnvData] = useState<EnvironmentData>(() => envFromSession(session));

  const isEdit = !!session;
  // "Excluir" asks once more before deleting.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!session) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    const { error } = await deleteSleepSession(supabase, session.id);
    setDeleting(false);
    if (error) {
      toast.error("Erro ao excluir registro");
      return;
    }
    toast.success("Registro excluído");
    // The deleted sleep may be the last one: refresh forecast and wake window too.
    void invalidateSleepQueries(queryClient, session.baby_id);
    onClose();
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
    defaultValues: buildFormValues(session, day),
  });

  useTimeRangeValidation(control, RANGE_NAMES, { clearErrors });

  const [selectedType, quality, howFellAsleep, wakeReason] = useWatch({
    control,
    name: ["type", "quality", "how_fell_asleep", "wake_reason"],
  });

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

    if (isEndBeforeStart(startTime, endTime)) {
      setError("end_time_input", { type: "validate", message: END_BEFORE_START_MESSAGE });
      toast.error(END_BEFORE_START_MESSAGE);
      return;
    }

    const payload = {
      type: data.type,
      start_time: startTime,
      end_time: endTime,
      quality: data.quality ? parseInt(data.quality) : null,
      how_fell_asleep: data.how_fell_asleep || null,
      wake_reason: data.wake_reason || null,
      notes: data.notes || null,
      // `location` is no longer edited here ("Como adormeceu?" covers it):
      // left out so an edit keeps whatever the column already holds.
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
        toast.error(isCheckViolation(error) ? END_BEFORE_START_MESSAGE : "Erro ao atualizar registro");
        return;
      }
      toast.success("Registro atualizado");
    } else {
      const { error } = await supabase
        .from("sleep_sessions")
        .insert({ ...payload, baby_id: activeBaby.id });

      if (error) {
        toast.error(isCheckViolation(error) ? END_BEFORE_START_MESSAGE : "Erro ao criar registro");
        return;
      }
      toast.success("Sono registrado manualmente");
    }

    // Lists, forecast, wake window and regression all derive from sleeps.
    void invalidateSleepQueries(queryClient, activeBaby.id);
    onClose();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <SegmentedControl
        size="sm"
        aria-label="Tipo de sono"
        value={selectedType}
        onChange={(v) => setValue("type", v)}
        options={TYPE_OPTIONS}
      />

      <DateTimeRangeFields control={control} names={RANGE_NAMES} />

      <div className="space-y-1">
        <p id={qualityLabelId} className={LABEL}>Qualidade do sono</p>
        <StarRating
          label="Qualidade do sono"
          labelledBy={qualityLabelId}
          value={quality ? Number(quality) : null}
          onChange={(v) => setValue("quality", v === null ? "" : String(v))}
        />
      </div>

      <Select
        items={{ [CLEAR_VALUE]: CLEAR_LABEL, ...howFellAsleepLabels(sex) }}
        value={howFellAsleep ?? ""}
        onValueChange={(v) => setValue("how_fell_asleep", fromSelect(v))}
      >
        <SelectTrigger className={TRIGGER} aria-label="Como adormeceu">
          <SelectValue placeholder="Como adormeceu? (opcional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CLEAR_VALUE}>{CLEAR_LABEL}</SelectItem>
          {howFellAsleepOptions(sex).map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedType === "NIGHT_SLEEP" && (
        <Select
          items={{ [CLEAR_VALUE]: CLEAR_LABEL, ...wakeReasonLabels(sex) }}
          value={wakeReason ?? ""}
          onValueChange={(v) => setValue("wake_reason", fromSelect(v))}
        >
          <SelectTrigger className={TRIGGER} aria-label="Motivo do despertar">
            <SelectValue placeholder="Por que acordou? (opcional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CLEAR_VALUE}>{CLEAR_LABEL}</SelectItem>
            {wakeReasonOptions(sex).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="space-y-1">
        <label htmlFor="notes" className="sr-only">Notas</label>
        <Textarea
          id="notes"
          placeholder="Notas (opcional)"
          {...register("notes")}
          className="resize-none rounded-xl border-sn-mu/70 px-3"
          rows={2}
        />
      </div>

      {/* ── Environment section ── */}
      <div className="overflow-hidden rounded-xl border border-sn-bd">
        <button
          type="button"
          aria-expanded={envOpen}
          aria-controls="env-section"
          onClick={() => setEnvOpen((o) => !o)}
          className="flex min-h-11 w-full cursor-pointer items-center justify-between px-4 py-3 text-left outline-none hover:bg-sn-s2/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sn-pr active:bg-sn-s2 disabled:pointer-events-none disabled:opacity-55"
          style={{ touchAction: "manipulation" }}
        >
          <div className="flex items-center gap-2">
            <IconLeaf size={16} className="text-sn-ok" />
            <span className="font-sans text-[15px] font-bold text-sn-tx">Condições do ambiente</span>
            {envFilled > 0 && (
              <span className="rounded-full bg-sn-pr/20 px-2 py-0.5 font-sans text-xs font-bold text-sn-pr">
                {envFilled} preenchido{envFilled > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <IconChevronDown
            size={16}
            className={cn(
              "text-sn-mu transition-transform duration-(--sn-dur-short) ease-sn-out motion-reduce:transition-none",
              envOpen && "rotate-180"
            )}
          />
        </button>

        {envOpen && (
          <div id="env-section" className="border-t border-sn-bd p-4">
            <EnvironmentPicker value={envData} onChange={setEnvData} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {isEdit && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            loading={deleting}
            className="mr-auto"
          >
            {confirmDelete ? "Confirmar exclusão" : "Excluir"}
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" loading={isSubmitting}>
            {isEdit ? "Atualizar" : "Registrar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
