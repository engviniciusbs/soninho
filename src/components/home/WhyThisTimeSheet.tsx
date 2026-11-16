"use client";

import { useState } from "react";
import { differenceInWeeks } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { IconThumbDown, IconThumbUp } from "@/components/brand/icons";
import type { AISuggestion, Baby, WakeWindowRange } from "@/types";
import { formatWindowBound } from "./format";
import { parseLocalDate } from "@/lib/dates/localDate";

export interface WhyThisTimeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: AISuggestion | null | undefined;
  baby: Baby | null;
  range: WakeWindowRange;
}

/** "Por que esse horário?": the explanation and feedback that lived in AISuggestionCard. */
export function WhyThisTimeSheet({ open, onOpenChange, suggestion, baby, range }: WhyThisTimeSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-[480px]">
        <SheetHeader>
          <SheetTitle className="font-display text-[22px] font-bold">Por que esse horário?</SheetTitle>
          <SheetDescription>
            {suggestion
              ? "Sugestão feita a partir dos últimos sonos do bebê."
              : "Previsão feita pela janela de vigília da idade."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          {suggestion ? (
            <SuggestionBody suggestion={suggestion} baby={baby} />
          ) : (
            <p className="font-sans text-base text-sn-tx">
              Sem sugestão personalizada no momento. A previsão soma a janela de vigília da
              idade, de {formatWindowBound(range.minMinutes)} a {formatWindowBound(range.maxMinutes)},
              ao fim do último sono.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SuggestionBody({ suggestion, baby }: { suggestion: AISuggestion; baby: Baby | null }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [voting, setVoting] = useState(false);
  const isNight = suggestion.kind === "NIGHT_SLEEP";

  async function handleVote(value: "up" | "down") {
    if (!baby || voting || vote) return;
    setVote(value);
    setVoting(true);
    try {
      await fetch("/api/suggestions/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyId: baby.id,
          vote: value,
          suggestedTime: suggestion.suggestedNapTime ?? null,
          windowStart: suggestion.windowStart ?? null,
          windowEnd: suggestion.windowEnd ?? null,
          ageWeeks: differenceInWeeks(new Date(), parseLocalDate(baby.birth_date)),
        }),
      });
    } catch {
      // Non-blocking: keep the optimistic state.
    } finally {
      setVoting(false);
    }
  }

  return (
    <>
      {suggestion.windowStart && suggestion.windowEnd && (
        <p className="font-sans text-base font-bold text-sn-tx tabular-nums">
          {isNight ? "Horário sugerido" : "Janela ideal"}: {suggestion.windowStart} a {suggestion.windowEnd}
        </p>
      )}
      {suggestion.reasoning && (
        <p className="font-sans text-base leading-relaxed text-sn-tx">{suggestion.reasoning}</p>
      )}
      <div className="flex min-h-11 items-center gap-2 border-t border-sn-bd pt-4">
        <p role="status" className="mr-auto font-sans text-sm font-semibold text-sn-mu">
          {vote ? <span className="font-bold text-sn-ok">Obrigado pelo feedback!</span> : "Foi útil?"}
        </p>
        {!vote && (
          <>
            <Button variant="icon" size="icon" aria-label="Útil" disabled={voting} onClick={() => handleVote("up")}>
              <IconThumbUp size={22} />
            </Button>
            <Button variant="icon" size="icon" aria-label="Não útil" disabled={voting} onClick={() => handleVote("down")}>
              <IconThumbDown size={22} />
            </Button>
          </>
        )}
      </div>
    </>
  );
}
