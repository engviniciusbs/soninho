"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
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
import type { SleepSession } from "@/types";

const formSchema = z.object({
  type: z.enum(["NAP", "NIGHT_SLEEP"]),
  start_date: z.string().min(1),
  start_time_input: z.string().min(1),
  end_date: z.string().min(1),
  end_time_input: z.string().min(1),
  quality: z.string().optional(),
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

  const isEdit = !!session;

  const defaultStart = session
    ? new Date(session.start_time)
    : new Date();
  const defaultEnd = session?.end_time
    ? new Date(session.end_time)
    : new Date();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: session?.type ?? "NAP",
      start_date: defaultStart.toISOString().split("T")[0],
      start_time_input: defaultStart.toTimeString().slice(0, 5),
      end_date: defaultEnd.toISOString().split("T")[0],
      end_time_input: defaultEnd.toTimeString().slice(0, 5),
      quality: session?.quality?.toString() ?? "",
      notes: session?.notes ?? "",
      location: session?.location ?? "",
    },
  });

  const selectedType = watch("type");

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
      notes: data.notes || null,
      location: data.location || null,
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
      <DialogContent className="rounded-2xl max-w-md">
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
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NAP">Soneca</SelectItem>
              <SelectItem value="NIGHT_SLEEP">Sono noturno</SelectItem>
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Data início
              </label>
              <Input
                type="date"
                {...register("start_date")}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Hora início
              </label>
              <Input
                type="time"
                {...register("start_time_input")}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Data fim
              </label>
              <Input
                type="date"
                {...register("end_date")}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Hora fim
              </label>
              <Input
                type="time"
                {...register("end_time_input")}
                className="rounded-xl"
              />
            </div>
          </div>

          <Select
            value={watch("quality") ?? ""}
            onValueChange={(v) => v && setValue("quality", v)}
          >
            <SelectTrigger className="rounded-xl">
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

          <Input
            placeholder="Local (berço, braço, carrinho...)"
            {...register("location")}
            className="rounded-xl"
          />

          <Textarea
            placeholder="Notas (opcional)"
            {...register("notes")}
            className="rounded-xl resize-none"
            rows={2}
          />

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
                ? "Salvando..."
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
