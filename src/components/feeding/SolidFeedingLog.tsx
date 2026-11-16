"use client";

import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNoBabyToast } from "@/lib/toasts/noBaby";
import { createClient } from "@/lib/supabase/client";
import { logSolidFeeding } from "@/lib/supabase/feedingQueries";
import { recordFeedingActivity } from "@/lib/family/recordFeedingActivity";
import { useBaby } from "@/components/providers/BabyProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { COMMON_FOOD_TAGS } from "@/lib/feeding/foodTags";
import type { FoodReaction } from "@/types";

const REACTION_OPTIONS: { value: FoodReaction; label: string }[] = [
  { value: "LOVED", label: "Adorou" },
  { value: "LIKED", label: "Gostou" },
  { value: "NEUTRAL", label: "Neutro" },
  { value: "DISLIKED", label: "Não gostou" },
  { value: "ALLERGIC_REACTION", label: "Reação alérgica" },
];

const COMMON: readonly string[] = COMMON_FOOD_TAGS;

/** Solids quick log: foods as chips (plus any other typed in), the reaction, register. */
export function SolidFeedingLog() {
  const labelId = useId();
  const customId = useId();
  const { activeBaby } = useBaby();
  const toastNoBaby = useNoBabyToast();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [reaction, setReaction] = useState<FoodReaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Foods typed in show up as selected chips after the common ones.
  const customTags = selectedTags.filter((t) => !COMMON.includes(t));

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function addCustomTag() {
    const trimmed = customTag.trim();
    if (!trimmed || selectedTags.includes(trimmed)) return;
    setSelectedTags((prev) => [...prev, trimmed]);
    setCustomTag("");
  }

  async function handleSubmit() {
    if (!activeBaby) {
      toastNoBaby();
      return;
    }
    if (selectedTags.length === 0) {
      toast.error("Selecione ao menos um alimento");
      return;
    }
    setSubmitting(true);
    const { data, error } = await logSolidFeeding(supabase, activeBaby.id, {
      food_tags: selectedTags,
      reaction,
    });
    setSubmitting(false);

    if (error || !data) {
      toast.error("Erro ao registrar refeição");
      return;
    }

    toast.success("Refeição de sólidos registrada");
    queryClient.invalidateQueries({ queryKey: ["feeding-timeline"] });
    setSelectedTags([]);
    setReaction(null);
    void recordFeedingActivity({
      babyId: activeBaby.id,
      babyName: activeBaby.name,
      action: "logged",
      feedingType: "SOLID",
      referenceId: data.id,
    });
  }

  return (
    <Card role="region" aria-labelledby={labelId} className="gap-0 px-[18px]">
      <p id={labelId} className="font-sans text-sm font-bold text-sn-mu">
        O que comeu
      </p>

      <div role="group" aria-label="Alimentos" className="mt-3 flex flex-wrap gap-2">
        {COMMON_FOOD_TAGS.map((tag) => (
          <Chip key={tag} selected={selectedTags.includes(tag)} onClick={() => toggleTag(tag)}>
            {tag}
          </Chip>
        ))}
        {customTags.map((tag) => (
          <Chip key={tag} selected onClick={() => toggleTag(tag)}>
            {tag}
          </Chip>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <label htmlFor={customId} className="sr-only">
          Outro alimento
        </label>
        <Input
          id={customId}
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustomTag();
            }
          }}
          placeholder="Outro alimento…"
          autoComplete="off"
          className="h-11 rounded-full border-sn-mu/70 px-4"
        />
        <Button variant="secondary" size="sm" onClick={addCustomTag}>
          Adicionar
        </Button>
      </div>

      <p className="mt-4 font-sans text-sm font-bold text-sn-mu">Reação</p>
      <div role="group" aria-label="Reação do bebê" className="mt-2 flex flex-wrap gap-2">
        {REACTION_OPTIONS.map(({ value, label }) => (
          <Chip
            key={value}
            selected={reaction === value}
            onClick={() => setReaction((r) => (r === value ? null : value))}
          >
            {label}
          </Chip>
        ))}
      </div>

      <Button className="mt-4 w-full" onClick={handleSubmit} loading={submitting}>
        Registrar
      </Button>
    </Card>
  );
}
