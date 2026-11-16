"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { startSleepSession, endSleepSession, getActiveSleepSession, getSleepSessionStatus } from "@/lib/supabase/queries/sleep";
import { useSleepStore, useActiveSleepTimer, type SleepType } from "@/store/sleepStore";
import { useBaby } from "@/components/providers/BabyProvider";
import { formatElapsedSeconds } from "@/lib/utils";
import { toast } from "sonner";
import { classifyEndResult, isUniqueViolation } from "@/lib/supabase/sessionConflict";
import { recordSleepActivity } from "@/lib/family/recordSleepActivity";
import { useSessionClock } from "@/hooks/timer/useSessionClock";
import { useActiveSessionSync } from "@/hooks/timer/useActiveSessionSync";
import { invalidateSleepQueries as invalidateSleep } from "@/lib/query/invalidateSleep";

/** How often a phone with no local timer looks for a sleep started elsewhere. */
export const OPEN_SESSION_POLL_MS = 30_000;

export function useSleepTimer() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { activeBaby } = useBaby();
  const babyId = activeBaby?.id ?? null;

  // Timers are per baby: the shown baby's running timer (if any), otherwise
  // the pre-start draft feeds the form.
  const timer = useActiveSleepTimer(babyId);
  const draft = useSleepStore((s) => s.draft);
  const startTimer = useSleepStore((s) => s.startTimer);
  const stopTimer = useSleepStore((s) => s.stopTimer);
  const restoreFromSession = useSleepStore((s) => s.restoreFromSession);
  const updateDraft = useSleepStore((s) => s.updateDraft);

  const isRunning = timer !== null;
  const sessionId = timer?.sessionId ?? null;
  const startTime = timer?.startTime ?? null;
  const view = timer ?? draft;
  const { sleepType, notes, roomTemp, weatherCondition, sleepSackType, sleepSackTog } = view;

  const setSleepType = useCallback((type: SleepType) => updateDraft(babyId, { sleepType: type }), [updateDraft, babyId]);
  const setNotes = useCallback((v: string) => updateDraft(babyId, { notes: v }), [updateDraft, babyId]);
  const setRoomTemp = useCallback((v: number | null) => updateDraft(babyId, { roomTemp: v }), [updateDraft, babyId]);
  const setWeatherCondition = useCallback((v: string | null) => updateDraft(babyId, { weatherCondition: v }), [updateDraft, babyId]);
  const setSleepSackType = useCallback((v: string | null) => updateDraft(babyId, { sleepSackType: v }), [updateDraft, babyId]);
  const setSleepSackTog = useCallback((v: number | null) => updateDraft(babyId, { sleepSackTog: v }), [updateDraft, babyId]);

  // Shared clock: "00:00:00" while stopped and until the clock's first value.
  const { elapsedSec } = useSessionClock(startTime);
  const elapsed = elapsedSec === null ? "00:00:00" : formatElapsedSeconds(elapsedSec);

  const invalidateSleepQueries = useCallback(() => {
    if (babyId) void invalidateSleep(queryClient, babyId);
  }, [queryClient, babyId]);

  // Without a local timer, look for the shown baby's open session: on mount,
  // on a baby switch, after a local timer was dropped, and every 30 s while
  // the page is visible (react-query pauses the interval in the background
  // and refetches on focus), so a sleep started on another phone shows up.
  // Read-only; once a timer exists the query is disabled and
  // useActiveSessionSync takes over. Adoption happens in the queryFn, so only
  // a fresh answer adopts: cached data about a session that has since ended
  // is never applied again.
  useQuery({
    queryKey: ["open-sleep-session", babyId],
    queryFn: async () => {
      const id = babyId as string;
      const { data, error } = await getActiveSleepSession(supabase, id);
      if (error) throw error;
      // Don't clobber a timer started locally while the request was in flight.
      if (data && !useSleepStore.getState().timers[id]) {
        restoreFromSession(id, data.id, data.start_time, data.type as SleepType);
      }
      return data?.id ?? null;
    },
    enabled: !!babyId && !isRunning,
    refetchInterval: OPEN_SESSION_POLL_MS,
    refetchIntervalInBackground: false,
    retry: false, // the next poll is the retry
    staleTime: 0,
    gcTime: 0,
  });

  useActiveSessionSync({
    queryKey: "active-session-live",
    babyId,
    sessionId,
    fetchStatus: (id) => getSleepSessionStatus(supabase, id),
    onEnded: () => {
      if (!babyId) return;
      stopTimer(babyId);
      invalidateSleepQueries();
      toast.info("Sono finalizado por outro cuidador(a)");
    },
    onMismatch: () => {
      // Stale local state pointing at another baby's session: drop it; the
      // restore effect then loads this baby's real open session, if any.
      if (babyId) stopTimer(babyId);
    },
  });

  const handleStart = useCallback(async (startTimeIso?: string) => {
    if (!activeBaby) {
      toast.error("Adicione um bebê primeiro nas configurações");
      return;
    }
    const baby = activeBaby;

    const start = () =>
      startSleepSession(supabase, baby.id, sleepType, {
        notes: notes || undefined,
        room_temp_celsius: roomTemp,
        weather_condition: weatherCondition,
        sleep_sack_type: sleepSackType,
        sleep_sack_tog: sleepSackTog,
        start_time: startTimeIso,
      });

    let { data, error } = await start();

    if (error && isUniqueViolation(error)) {
      // Another caregiver already has an open session: sync to it.
      const { data: existing } = await getActiveSleepSession(supabase, baby.id);
      if (existing) {
        restoreFromSession(baby.id, existing.id, existing.start_time, existing.type as SleepType);
        toast.success("Já existe um sono em andamento, sincronizado");
        return;
      }
      // The conflicting session was closed in the meantime: try once more.
      ({ data, error } = await start());
    }

    if (error || !data) {
      toast.error("Erro ao iniciar sessão de sono");
      return;
    }

    startTimer(baby.id, data.id, data.start_time, sleepType);
    toast.success(sleepType === "NAP" ? "Soneca iniciada" : "Sono noturno iniciado");
    void recordSleepActivity({
      babyId: baby.id,
      babyName: baby.name,
      action: "started",
      sleepSessionId: data.id,
      sleepType,
    });
  }, [activeBaby, sleepType, notes, roomTemp, weatherCondition, sleepSackType, sleepSackTog, supabase, startTimer, restoreFromSession]);

  /**
   * Ends the running session. Returns the ended session's id/type when THIS
   * user successfully ended it (so the UI can prompt a post-sleep review),
   * or null in every other case (no session, already ended, error).
   */
  const handleStop = useCallback(async (): Promise<{
    endedSessionId: string;
    sleepType: SleepType;
  } | null> => {
    if (!babyId) return null;
    if (!sessionId) {
      stopTimer(babyId);
      return null;
    }

    const endedType = sleepType;

    // Verify the session still exists and hasn't already been ended.
    // This covers: another user stopped it, stale Zustand state, or auth cookie issues.
    const { data: current, error: readError } = await getSleepSessionStatus(supabase, sessionId);

    if (readError) {
      // Network/auth failure: keep the timer, the session is still open.
      toast.error("Erro ao finalizar o sono. Tente novamente.");
      return null;
    }

    if (!current) {
      // Session not found (deleted or never created) — clean up silently
      stopTimer(babyId);
      invalidateSleepQueries();
      return null;
    }

    if (current.baby_id !== babyId) {
      // Stale local state pointing at another baby's session (e.g. migrated
      // v0 state): drop this baby's timer, never end that session.
      stopTimer(babyId);
      return null;
    }

    const syncAlreadyEnded = () => {
      // Already ended by another caregiver — just sync local state
      stopTimer(babyId);
      invalidateSleepQueries();
      toast.success("Sono já estava finalizado");
    };

    if (current.end_time) {
      syncAlreadyEnded();
      return null;
    }

    // DB start_time is authoritative (it may have been edited by someone else).
    const { error } = await endSleepSession(supabase, sessionId, current.start_time);
    const outcome = classifyEndResult(error);

    if (outcome === "already-ended") {
      // Lost the race (double tap / another caregiver): no second "stopped".
      syncAlreadyEnded();
      return null;
    }
    if (outcome !== "ok") {
      toast.error(
        outcome === "check"
          ? "Erro ao finalizar o sono. Tente novamente."
          : "Sessão expirada. Faça login novamente."
      );
      return null;
    }

    const endedId = sessionId;
    stopTimer(babyId);
    toast.success("Sono registrado com sucesso");
    invalidateSleepQueries();

    if (activeBaby) {
      void recordSleepActivity({
        babyId: activeBaby.id,
        babyName: activeBaby.name,
        action: "stopped",
        sleepSessionId: endedId,
        sleepType: endedType,
      });
    }

    return { endedSessionId: endedId, sleepType: endedType };
  }, [babyId, sessionId, sleepType, activeBaby, supabase, stopTimer, invalidateSleepQueries]);

  return {
    isRunning,
    elapsed,
    sleepType,
    notes,
    roomTemp,
    weatherCondition,
    sleepSackType,
    sleepSackTog,
    setSleepType,
    setNotes,
    setRoomTemp,
    setWeatherCondition,
    setSleepSackType,
    setSleepSackTog,
    handleStart,
    handleStop,
  };
}
