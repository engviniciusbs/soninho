"use client";

import { useId } from "react";
import { useFeedingSuggestion } from "@/hooks/useFeedingSuggestion";
import { useActiveBreastTimer } from "@/store/feedingStore";
import { useBaby } from "@/components/providers/BabyProvider";
import { Card } from "@/components/ui/card";
import { BigNumber } from "@/components/ui/big-number";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/utils";
import { feedingExplanation } from "@/lib/feeding/suggestionExplanation";

/** "Pelo intervalo…" read in the middle of a sentence. */
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** "Próxima mamada" (mockup `.hero` on Comida): the time, how soon, and where it came from. */
export function FeedingSuggestionCard() {
  const labelId = useId();
  const { data: suggestion, isLoading } = useFeedingSuggestion();
  const { activeBaby } = useBaby();
  const isRunning = useActiveBreastTimer(activeBaby?.id) !== null;

  if (isRunning) return null;
  if (isLoading) {
    return (
      <Card aria-busy="true" aria-label="Carregando próxima mamada" className="gap-0 px-[18px]">
        <Skeleton className="h-4 w-28 rounded-lg" />
        <Skeleton className="my-1.5 h-12 w-32 rounded-xl" />
        <Skeleton className="h-4 w-60 rounded-lg" />
      </Card>
    );
  }
  // No answer from the API: the card stays out, as before.
  if (!suggestion) return null;

  const empty = !suggestion.suggestedTime;
  const overdue = suggestion.suggestedTime === "Assim que possível";
  const explanation = empty ? "" : feedingExplanation(suggestion);
  const soon = !overdue && suggestion.minutesUntilSuggested > 0;

  return (
    <Card role="region" aria-labelledby={labelId} className="gap-0 px-[18px]">
      <p id={labelId} className="font-sans text-sm font-bold text-sn-mu">
        Próxima mamada
      </p>
      {empty ? (
        <p className="mt-1.5 font-sans text-base font-semibold text-sn-tx">
          Registre a primeira mamada para ver aqui o horário da próxima.
        </p>
      ) : (
        <>
          <BigNumber className="my-1.5 text-[48px] leading-none tracking-[-0.02em]">
            {overdue ? "Agora" : suggestion.suggestedTime}
          </BigNumber>
          <p className="font-sans text-sm font-semibold text-sn-mu">
            {soon
              ? `Em cerca de ${formatDuration(suggestion.minutesUntilSuggested)}, ${lowerFirst(explanation)}`
              : explanation}
          </p>
        </>
      )}
    </Card>
  );
}
