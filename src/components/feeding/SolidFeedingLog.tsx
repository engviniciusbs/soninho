"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Salad, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { logSolidFeeding } from "@/lib/supabase/feedingQueries";
import { recordFeedingActivity } from "@/lib/family/recordFeedingActivity";
import { useBaby } from "@/components/providers/BabyProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { COMMON_FOOD_TAGS } from "@/lib/feeding/foodTags";
import type { FoodReaction } from "@/types";

const REACTION_OPTIONS: { value: FoodReaction; emoji: string; label: string }[] = [
  { value: "LOVED", emoji: "😍", label: "Adorou" },
  { value: "LIKED", emoji: "🙂", label: "Gostou" },
  { value: "NEUTRAL", emoji: "😐", label: "Neutro" },
  { value: "DISLIKED", emoji: "😖", label: "Não gostou" },
  { value: "ALLERGIC_REACTION", emoji: "⚠️", label: "Reação alérgica" },
];

export function SolidFeedingLog() {
  const { activeBaby } = useBaby();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [reaction, setReaction] = useState<FoodReaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      toast.error("Adicione um bebê primeiro nas configurações");
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

    toast.success("Refeição de sólidos registrada 🥣");
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
    <div className="flex flex-col items-center gap-6 py-4 w-full">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
        <Salad className="h-7 w-7 text-emerald-400" aria-hidden="true" />
      </div>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center max-w-sm">
          {selectedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
            >
              {tag}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      {/* Food tag grid */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-md" role="group" aria-label="Alimentos">
        {COMMON_FOOD_TAGS.map((tag) => {
          const isActive = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={isActive}
              onClick={() => toggleTag(tag)}
              className={cn(
                "rounded-xl border py-2 px-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  : "border-border/50 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground"
              )}
              style={{ touchAction: "manipulation" }}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Custom tag input */}
      <div className="flex gap-2 w-full max-w-sm">
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
        <Button variant="outline" onClick={addCustomTag} className="rounded-xl shrink-0">
          Adicionar
        </Button>
      </div>

      {/* Reaction */}
      <div className="flex gap-2 flex-wrap justify-center" role="group" aria-label="Reação do bebê">
        {REACTION_OPTIONS.map(({ value, emoji, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={reaction === value}
            aria-label={label}
            onClick={() => setReaction((r) => (r === value ? null : value))}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl border px-2.5 py-1.5 text-[11px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              reaction === value
                ? "border-emerald-500/50 bg-emerald-500/10"
                : "border-border/50 bg-card/40 hover:border-border"
            )}
            style={{ touchAction: "manipulation" }}
          >
            <span className="text-base" aria-hidden="true">{emoji}</span>
            <span className="text-muted-foreground">{label}</span>
          </button>
        ))}
      </div>

      <motion.div whileTap={{ scale: 0.97 }} className="w-full max-w-sm">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-11 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-500/90"
        >
          {submitting ? "Registrando…" : "Registrar refeição"}
        </Button>
      </motion.div>
    </div>
  );
}
