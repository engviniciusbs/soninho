"use client";

/**
 * SleepTimer: owner of the home's sleep state (spec §8.3). It decides between
 * the awake pieces (next-sleep card, wake window, start controls) and the
 * sleeping card, and opens the post-sleep review after a stop. The pieces are
 * presentational and live in src/components/home.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useSleepTimer } from "@/hooks/useSleepTimer";
import { useWakeWindow } from "@/hooks/useWakeWindow";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { wakeWindowMidpoint } from "@/lib/sleep/wakeWindows";
import { useNow } from "@/hooks/useNow";
import { useBaby } from "@/components/providers/BabyProvider";
import { useActiveSleepTimer } from "@/store/sleepStore";
import { createClient } from "@/lib/supabase/client";
import { getSleepSessionDetails, updateSleepSession } from "@/lib/supabase/queries/sleep";
import { NextSleepCard } from "@/components/home/NextSleepCard";
import { WakeWindowCard } from "@/components/home/WakeWindowCard";
import { StartSleepControls } from "@/components/home/StartSleepControls";
import { SleepingCard } from "@/components/home/SleepingCard";
import { WhyThisTimeSheet } from "@/components/home/WhyThisTimeSheet";
import type { EnvironmentData } from "./EnvironmentPicker";
import { PostSleepReview } from "./PostSleepReview";
import { useBackdate } from "./timer/useBackdate";

/** Local hours in which the type selector may follow a NAP suggestion: [05:00, 19:00). */
const AUTO_SWITCH_FROM_HOUR = 5;
const AUTO_SWITCH_UNTIL_HOUR = 19;

/** What the open session holds for the fields editable during a sleep. */
interface SessionFields {
  room_temp_celsius: number | null;
  weather_condition: string | null;
  sleep_sack_type: string | null;
  sleep_sack_tog: number | null;
  notes: string;
}
type FieldKey = keyof SessionFields;
const ENV_KEYS: FieldKey[] = ["room_temp_celsius", "weather_condition", "sleep_sack_type", "sleep_sack_tog"];

/**
 * `canWrite` false (a viewer, or while the role loads): the sleep is shown
 * but not started, stopped or edited.
 */
export function SleepTimer({ nanny = false, canWrite = true }: { nanny?: boolean; canWrite?: boolean }) {
  const {
    isRunning, elapsed, sleepType,
    notes, roomTemp, weatherCondition, sleepSackType, sleepSackTog,
    setSleepType, setNotes, setRoomTemp, setWeatherCondition,
    setSleepSackType, setSleepSackTog, handleStart, handleStop,
  } = useSleepTimer();

  const { activeBaby } = useBaby();
  const timer = useActiveSleepTimer(activeBaby?.id);
  const {
    elapsedMinutes, status, range, lastSleepEnd, isLoading: wwLoading,
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
  // change it afterwards. Switching to Soneca only happens between 05:00 and
  // 19:00: at night a waking must not turn the selector into a nap.
  const appliedSuggestion = useRef<string | null>(null);
  const aiKind = ai?.kind;
  const aiTime = ai?.suggestedNapTime;
  const hour = now == null ? null : new Date(now).getHours();
  useEffect(() => {
    if (!aiKind || isRunning || hour == null) return;
    const daytime = hour >= AUTO_SWITCH_FROM_HOUR && hour < AUTO_SWITCH_UNTIL_HOUR;
    if (aiKind === "NAP" && !daytime) return;
    const key = `${activeBaby?.id}:${aiKind}:${aiTime}`;
    if (appliedSuggestion.current === key) return;
    appliedSuggestion.current = key;
    if (aiKind !== sleepType) setSleepType(aiKind);
  }, [aiKind, aiTime, activeBaby?.id, isRunning, hour, sleepType, setSleepType]);

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
    for (const k of ENV_KEYS) {
      const key = k as keyof EnvironmentData;
      if (d[key] !== envData[key]) edited.current.add(k);
    }
    setRoomTemp(d.room_temp_celsius);
    setWeatherCondition(d.weather_condition);
    setSleepSackType(d.sleep_sack_type);
    setSleepSackTog(d.sleep_sack_tog);
  }

  // Environment and notes edited during the sleep go to the open session;
  // stopping only sets end_time. The session row is the source of truth: it
  // seeds the local values (a session restored from the DB, or started on
  // another phone, has none locally) and is the snapshot each save diffs
  // against, so a save only sends what this user changed.
  const sessionId = timer?.sessionId ?? null;
  const snapshot = useRef<SessionFields | null>(null);
  // Fields the user changed since their sheet opened: a session read that
  // lands after the edit must not overwrite it.
  const edited = useRef(new Set<FieldKey>());

  const local: SessionFields = {
    room_temp_celsius: roomTemp,
    weather_condition: weatherCondition,
    sleep_sack_type: sleepSackType,
    sleep_sack_tog: sleepSackTog,
    notes,
  };

  const applyLocal = useCallback(
    (f: Partial<SessionFields>) => {
      if ("room_temp_celsius" in f) setRoomTemp(f.room_temp_celsius ?? null);
      if ("weather_condition" in f) setWeatherCondition(f.weather_condition ?? null);
      if ("sleep_sack_type" in f) setSleepSackType(f.sleep_sack_type ?? null);
      if ("sleep_sack_tog" in f) setSleepSackTog(f.sleep_sack_tog ?? null);
      if ("notes" in f) setNotes(f.notes ?? "");
    },
    [setRoomTemp, setWeatherCondition, setSleepSackType, setSleepSackTog, setNotes]
  );

  const readSession = useCallback(async (): Promise<SessionFields | null> => {
    if (!sessionId) return null;
    const { data } = await getSleepSessionDetails(supabase, sessionId);
    if (!data) return null;
    return {
      room_temp_celsius: data.room_temp_celsius ?? null,
      weather_condition: data.weather_condition ?? null,
      sleep_sack_type: data.sleep_sack_type ?? null,
      sleep_sack_tog: data.sleep_sack_tog ?? null,
      notes: data.notes ?? "",
    };
  }, [sessionId, supabase]);

  // On a new running session: fill what the DB has; local values the DB
  // doesn't have yet are kept (they show up as changes on the next save).
  useEffect(() => {
    snapshot.current = null;
    edited.current.clear();
    if (!sessionId) return;
    let alive = true;
    void readSession().then((row) => {
      if (!alive || !row) return;
      snapshot.current = snapshot.current ?? row;
      const stored: Partial<SessionFields> = {};
      for (const k of [...ENV_KEYS, "notes"] as FieldKey[]) {
        if (edited.current.has(k)) continue;
        if (row[k] !== null && row[k] !== "") Object.assign(stored, { [k]: row[k] });
      }
      applyLocal(stored);
    });
    return () => {
      alive = false;
    };
  }, [sessionId, readSession, applyLocal]);

  // Opening a sheet re-reads the session, so it shows (and later diffs
  // against) what another caregiver may have saved meanwhile.
  async function syncFromSession(keys: FieldKey[]) {
    for (const k of keys) edited.current.delete(k);
    const row = await readSession();
    if (!row) return;
    snapshot.current = { ...(snapshot.current ?? row), ...pick(row, keys) };
    applyLocal(pick(row, keys.filter((k) => !edited.current.has(k))));
  }

  async function saveChanged(keys: FieldKey[], what: string) {
    if (!sessionId) return;
    // No snapshot yet (the first read failed or is still pending): read now,
    // and say so if that fails too, instead of dropping the edit. The local
    // values were never seeded from the row then, so only what the user
    // edited is sent; the rest of the sheet takes the server's values.
    let candidates = keys;
    if (!snapshot.current) {
      const row = await readSession();
      if (!row) {
        toast.error(`Não foi possível salvar ${what}`);
        return;
      }
      snapshot.current = row;
      candidates = keys.filter((k) => edited.current.has(k));
      applyLocal(pick(row, keys.filter((k) => !edited.current.has(k))));
    }
    const base = snapshot.current;
    const patch = Object.fromEntries(
      candidates
        .filter((k) => local[k] !== base[k])
        .map((k) => [k, k === "notes" ? local.notes || null : local[k]])
    ) as Parameters<typeof updateSleepSession>[2];
    if (Object.keys(patch).length === 0) return;
    const { error } = await updateSleepSession(supabase, sessionId, patch);
    if (error) {
      toast.error(`Não foi possível salvar ${what}`);
      return;
    }
    snapshot.current = { ...base, ...pick(local, candidates) };
    for (const k of candidates) edited.current.delete(k);
  }

  /* ── Next sleep: the AI suggestion, else the wake-window fallback ──
   * Both give an absolute instant; "em X min" and "overdue" come from the
   * 60 s clock, so the card keeps moving while the suggestion is cached. */
  const kind = ai?.kind ?? "NAP";
  let targetMs: number | null = null;
  if (ai?.suggestedAtIso) {
    targetMs = Date.parse(ai.suggestedAtIso);
  } else if (!wwLoading && now !== null) {
    // The middle of the wake window, as the suggestion: from the end of the
    // last sleep, or from now when there is none.
    const anchor = lastSleepEnd ? Date.parse(lastSleepEnd) : now;
    targetMs = wakeWindowMidpoint(anchor, range);
  }
  let time: string | null = null;
  let minutesUntil: number | null = null;
  let overdue = false;
  if (targetMs !== null && now !== null) {
    overdue = targetMs <= now;
    time = overdue ? "Agora" : format(new Date(targetMs), "HH:mm");
    minutesUntil = overdue ? null : (targetMs - now) / 60_000;
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
          onEnvironmentOpen={() => void syncFromSession(ENV_KEYS)}
          onEnvironmentDone={() => void saveChanged(ENV_KEYS, "o ambiente")}
          notes={notes}
          onNotesChange={(n) => {
            edited.current.add("notes");
            setNotes(n);
          }}
          onNotesOpen={() => void syncFromSession(["notes"])}
          onNotesDone={() => void saveChanged(["notes"], "a nota")}
          onStop={onStop}
          readOnly={!canWrite}
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
          {canWrite && (
            <StartSleepControls
              sleepType={sleepType}
              onSleepTypeChange={setSleepType}
              onStart={onStart}
              backdate={backdate}
            />
          )}
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

function pick(f: SessionFields, keys: FieldKey[]): Partial<SessionFields> {
  return Object.fromEntries(keys.map((k) => [k, f[k]])) as Partial<SessionFields>;
}
