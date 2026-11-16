"use client";

import { useId, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useBabySettings } from "@/hooks/settings/useBabySettings";
import { BabyAvatar } from "@/components/baby/BabyAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
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
  // "N" (Não informar) is the form's stand-in for null: the control needs a string.
  sex: z.enum(["F", "M", "N"]).transform((v) => (v === "N" ? null : v)),
});
type BabyFormInput = z.input<typeof babySchema>;
type BabyFormOutput = z.output<typeof babySchema>;
type SexChoice = BabyFormInput["sex"];

const SEX_OPTIONS: SegmentedOption<SexChoice>[] = [
  { value: "F", label: "Menina" },
  { value: "M", label: "Menino" },
  { value: "N", label: "Não informar" },
];

const LABEL = "font-sans text-sm font-bold text-sn-mu";
const FIELD = "h-11 rounded-xl border-sn-mu/70 px-3";

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
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
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
  const nameId = useId();
  const sexLabelId = useId();
  const birthId = useId();
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
      sex: baby?.sex ?? "N",
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
        <div className="flex flex-col items-center gap-2 py-1">
          <BabyAvatar
            avatarUrl={avatarUrl}
            name={name}
            size="lg"
            editable
            uploading={isUploading}
            onUploadClick={() => fileInputRef.current?.click()}
          />
          <p className="font-sans text-sm font-semibold text-sn-mu">
            {avatarUrl ? "Toque para alterar a foto" : "Toque para adicionar uma foto"}
          </p>
          {avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-sn-danger hover:bg-sn-danger/10"
              onClick={() => setValue("avatar_url", null)}
            >
              Remover foto
            </Button>
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

        <div className="space-y-1">
          <label htmlFor={nameId} className={LABEL}>
            Nome
          </label>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input
                id={nameId}
                placeholder="Nome do bebê"
                value={field.value}
                onChange={field.onChange}
                className={FIELD}
                autoComplete="off"
              />
            )}
          />
        </div>
        <div className="space-y-1">
          <p id={sexLabelId} className={LABEL}>
            Sexo
          </p>
          <Controller
            control={control}
            name="sex"
            render={({ field }) => (
              <SegmentedControl
                aria-labelledby={sexLabelId}
                size="sm"
                options={SEX_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={birthId} className={LABEL}>
            Data de nascimento
          </label>
          <Controller
            control={control}
            name="birth_date"
            render={({ field }) => (
              <Input
                id={birthId}
                type="date"
                value={field.value}
                onChange={field.onChange}
                className={FIELD}
              />
            )}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={onSubmit} loading={saving} disabled={isUploading}>
          Salvar
        </Button>
      </DialogFooter>
    </>
  );
}
