"use client";

/**
 * SleepTimer: owner of the home's sleep state (spec §8.3). It decides between
 * the awake pieces (next-sleep card, wake window, start controls) and the
 * sleeping card, and opens the post-sleep review after a stop. The pieces are
 * presentational and live in src/components/home.
 */

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useSleepTimer } from "@/hooks/useSleepTimer";
import { useWakeWindow } from "@/hooks/useWakeWindow";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { useNow } from "@/hooks/useNow";
import { useBaby } from "@/components/providers/BabyProvider";
import { useActiveSleepTimer } from "@/store/sleepStore";
import { createClient } from "@/lib/supabase/client";
import { updateSleepSession } from "@/lib/supabase/queries/sleep";
import { NextSleepCard } from "@/components/home/NextSleepCard";
import { WakeWindowCard } from "@/components/home/WakeWindowCard";
import { StartSleepControls } from "@/components/home/StartSleepControls";
import { SleepingCard } from "@/components/home/SleepingCard";
import { WhyThisTimeSheet } from "@/components/home/WhyThisTimeSheet";
import type { EnvironmentData } from "./EnvironmentPicker";
import { PostSleepReview } from "./PostSleepReview";
import { useBackdate } from "./timer/useBackdate";

const ASAP = "Assim que possível";

export function SleepTimer({ nanny = false }: { nanny?: boolean }) {
  const {
    isRunning, elapsed, sleepType,
    notes, roomTemp, weatherCondition, sleepSackType, sleepSackTog,
    setSleepType, setNotes, setRoomTemp, setWeatherCondition,
    setSleepSackType, setSleepSackTog, handleStart, handleStop,
  } = useSleepTimer();

  const { activeBaby } = useBaby();
  const timer = useActiveSleepTimer(activeBaby?.id);
  const {
    elapsedMinutes, status, range, minutesUntilNextNap, lastSleepEnd, isLoading: wwLoading,
  } = useWakeWindow();
  const { data: ai } = useAISuggestions();
  // Same 60s clock as the wake window; null on the server and the first
  // client render, so the clock-dependent fallback time appears after mount.
  const now = useNow(60_000);
  const supabase = createClient();

  const [whyOpen, setWhyOpen] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewType, setReviewType] = useState<"NAP" | "NIGHT_SLEEP">("NAP");
  const [reviewOpen, setReviewOpen] = useState(false);
  const backdate = useBackdate();

  // The selector follows each new suggestion's kind once; the user can still
  // change it afterwards.
  const appliedSuggestion = useRef<string | null>(null);
  const aiKind = ai?.kind;
  const aiTime = ai?.suggestedNapTime;
  useEffect(() => {
    if (!aiKind || isRunning) return;
    const key = `${activeBaby?.id}:${aiKind}:${aiTime}`;
    if (appliedSuggestion.current === key) return;
    appliedSuggestion.current = key;
    if (aiKind !== sleepType) setSleepType(aiKind);
  }, [aiKind, aiTime, activeBaby?.id, isRunning, sleepType, setSleepType]);

  async function onStart() {
    await handleStart(backdate.resolveStartIso());
    backdate.reset();
  }

  async function onStop() {
    const r = await handleStop();
    if (r) {
      setReviewId(r.endedSessionId);
      setReviewType(r.sleepType);
      setReviewOpen(true);
    }
  }

  const envData: EnvironmentData = {
    room_temp_celsius: roomTemp,
    weather_condition: weatherCondition,
    sleep_sack_type: sleepSackType,
    sleep_sack_tog: sleepSackTog,
    clothing_description: null,
  };

  function onEnvChange(d: EnvironmentData) {
    setRoomTemp(d.room_temp_celsius);
    setWeatherCondition(d.weather_condition);
    setSleepSackType(d.sleep_sack_type);
    setSleepSackTog(d.sleep_sack_tog);
  }

  // Environment and notes edited during the sleep go to the open session
  // right away; stopping only sets end_time.
  async function saveToSession(patch: Parameters<typeof updateSleepSession>[2], what: string) {
    if (!timer?.sessionId) return;
    const { error } = await updateSleepSession(supabase, timer.sessionId, patch);
    if (error) toast.error(`Não foi possível salvar ${what}`);
  }

  /* ── Next sleep: the AI suggestion, else the wake-window fallback ── */
  const kind = ai?.kind ?? "NAP";
  let time: string | null = null;
  let minutesUntil: number | null = null;
  let overdue = false;
  if (ai) {
    overdue = minutesUntilNextNap <= 0 || ai.suggestedNapTime === ASAP;
    time = overdue ? "Agora" : ai.suggestedNapTime;
    minutesUntil = overdue ? null : (ai.minutesUntilSuggested ?? minutesUntilNextNap);
  } else if (!wwLoading && now !== null) {
    overdue = minutesUntilNextNap <= 0;
    time = overdue ? "Agora" : format(new Date(now + minutesUntilNextNap * 60_000), "HH:mm");
    minutesUntil = overdue ? null : minutesUntilNextNap;
  }

  return (
    <div className="flex flex-col gap-3">
      {isRunning ? (
        <SleepingCard
          sleepType={sleepType}
          elapsed={elapsed}
          since={timer ? format(new Date(timer.startTime), "HH:mm") : null}
          environment={envData}
          onEnvironmentChange={onEnvChange}
          onEnvironmentDone={() =>
            void saveToSession(
              {
                room_temp_celsius: roomTemp,
                weather_condition: weatherCondition,
                sleep_sack_type: sleepSackType,
                sleep_sack_tog: sleepSackTog,
              },
              "o ambiente"
            )
          }
          notes={notes}
          onNotesChange={setNotes}
          onNotesDone={() => void saveToSession({ notes: notes || null }, "a nota")}
          onStop={onStop}
        />
      ) : (
        <>
          <NextSleepCard
            kind={kind}
            time={time}
            minutesUntil={minutesUntil}
            overdue={overdue}
            onWhy={nanny ? undefined : () => setWhyOpen(true)}
          />
          {!nanny && (
            <WakeWindowCard
              elapsedMinutes={elapsedMinutes}
              status={status}
              range={range}
              hasLastSleep={lastSleepEnd !== null}
              isLoading={wwLoading}
            />
          )}
          <StartSleepControls
            sleepType={sleepType}
            onSleepTypeChange={setSleepType}
            onStart={onStart}
            backdate={backdate}
          />
          {!nanny && (
            <WhyThisTimeSheet
              open={whyOpen}
              onOpenChange={setWhyOpen}
              suggestion={ai}
              baby={activeBaby}
              range={range}
            />
          )}
        </>
      )}

      <PostSleepReview
        sessionId={reviewId}
        sleepType={reviewType}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  );
}
