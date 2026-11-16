"use client";

import { useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useBabySettings } from "@/hooks/settings/useBabySettings";
import { BabyAvatar } from "@/components/baby/BabyAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Baby } from "@/types";

const REQUIRED_MESSAGE = "Preencha nome e data de nascimento";

const babySchema = z.object({
  name: z.string().trim().min(1, REQUIRED_MESSAGE),
  birth_date: z.string().min(1, REQUIRED_MESSAGE),
  // No longer edited here (the avatar shows the photo or the initial); the
  // stored value rides along unchanged so the payload keeps its shape.
  avatar_emoji: z.string(),
  avatar_url: z.string().nullable(),
});
type BabyFormInput = z.input<typeof babySchema>;
type BabyFormOutput = z.output<typeof babySchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Baby being edited; `null` adds a new one. */
  baby: Baby | null;
  /** Bumped on every open so the fields restart from `baby`. */
  session: number;
}

/** Add/edit baby dialog. */
export function BabyProfileForm({ open, onOpenChange, baby, session }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>{baby ? "Editar bebê" : "Adicionar bebê"}</DialogTitle>
        </DialogHeader>
        <BabyFields key={session} baby={baby} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function BabyFields({ baby, onDone }: { baby: Baby | null; onDone: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { save, uploadAvatar, isSaving, isUploading } = useBabySettings();
  const {
    control,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<BabyFormInput, unknown, BabyFormOutput>({
    resolver: zodResolver(babySchema),
    defaultValues: {
      name: baby?.name ?? "",
      birth_date: baby?.birth_date ?? "",
      avatar_emoji: baby?.avatar_emoji ?? "🍼",
      avatar_url: baby?.avatar_url ?? null,
    },
  });
  const [name, avatarUrl] = useWatch({
    control,
    name: ["name", "avatar_url"],
  });

  // Busy from the click on, validation included, as before the form moved to RHF.
  const saving = isSubmitting || isSaving;

  async function onUpload(file: File) {
    const url = await uploadAvatar(file);
    if (url) setValue("avatar_url", url);
  }

  const onSubmit = handleSubmit(
    async (values) => {
      if (await save({ id: baby?.id ?? null, ...values })) onDone();
    },
    () => {
      toast.error(REQUIRED_MESSAGE);
    }
  );

  return (
    <>
      <div className="space-y-4">
        {/* Avatar upload area */}
        <div className="flex flex-col items-center gap-2 py-2">
          <BabyAvatar
            avatarUrl={avatarUrl}
            name={name}
            size="lg"
            editable
            uploading={isUploading}
            onUploadClick={() => fileInputRef.current?.click()}
          />
          <p className="text-xs text-muted-foreground">
            {avatarUrl ? "Toque para alterar a foto" : "Toque para adicionar uma foto"}
          </p>
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setValue("avatar_url", null)}
              className="text-xs text-destructive hover:underline"
            >
              Remover foto
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            aria-label="Selecionar foto do bebê"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </div>

        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              placeholder="Nome do bebê"
              value={field.value}
              onChange={field.onChange}
              className="rounded-xl"
              autoComplete="off"
            />
          )}
        />
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Data de nascimento</label>
          <Controller
            control={control}
            name="birth_date"
            render={({ field }) => (
              <Input
                type="date"
                value={field.value}
                onChange={field.onChange}
                className="rounded-xl"
              />
            )}
          />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onDone} className="rounded-xl">
          Cancelar
        </Button>
        <Button onClick={onSubmit} disabled={saving || isUploading} className="rounded-xl">
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}
