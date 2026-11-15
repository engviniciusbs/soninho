"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  startSleepSession,
  endSleepSession,
  getActiveSleepSession,
  getSleepSessionStatus,
} from "@/lib/supabase/queries";
import { useSleepStore, useActiveSleepTimer, type SleepType } from "@/store/sleepStore";
import { useBaby } from "@/components/providers/BabyProvider";
import { formatElapsed } from "@/lib/utils";
import { toast } from "sonner";
import {
  classifyLiveSession,
  isCheckViolation,
  isUniqueViolation,
} from "@/lib/supabase/sessionConflict";
import { recordSleepActivity } from "@/lib/family/recordSleepActivity";

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

  // Last interval tick, tagged with the startTime it was computed for. The
  // displayed value is derived in render: "00:00:00" while stopped and until
  // the first tick of the current run (same UX as the previous reset-in-effect).
  const [tick, setTick] = useState<{ startTime: string; value: string } | null>(null);

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setTick({ startTime, value: formatElapsed(startTime) });
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const elapsed = startTime && tick?.startTime === startTime ? tick.value : "00:00:00";

  const invalidateSleepQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["sleep-sessions"] });
    queryClient.invalidateQueries({ queryKey: ["last-session"] });
    queryClient.invalidateQueries({ queryKey: ["last-session-key"] });
    queryClient.invalidateQueries({ queryKey: ["ai-suggestion"] });
  }, [queryClient]);

  // Restore the shown baby's open session from Supabase when it has no local
  // timer (mount, baby switch, or after a local timer was dropped).
  useEffect(() => {
    if (!babyId || isRunning) return;
    const id = babyId;
    async function restore() {
      const { data } = await getActiveSleepSession(supabase, id);
      // Don't clobber a timer started locally while the request was in flight.
      if (data && !useSleepStore.getState().timers[id]) {
        restoreFromSession(id, data.id, data.start_time, data.type as SleepType);
      }
    }
    void restore();
  }, [babyId, isRunning, supabase, restoreFromSession]);

  // Poll the running session (by id) every 20s. Only an error-free response
  // can stop the local timer; a network error keeps it (see classifyLiveSession).
  const { data: live } = useQuery({
    queryKey: ["active-session-live", babyId, sessionId],
    queryFn: async () => {
      const result = await getSleepSessionStatus(supabase, sessionId!);
      return { sessionId: sessionId!, status: classifyLiveSession(result, babyId!) };
    },
    enabled: !!babyId && !!sessionId,
    refetchInterval: 20_000,
    staleTime: 0,
  });

  useEffect(() => {
    if (!babyId || !live || live.sessionId !== sessionId) return;
    if (live.status === "ended") {
      stopTimer(babyId);
      invalidateSleepQueries();
      toast.info("Sono finalizado por outro cuidador(a)");
    } else if (live.status === "mismatch") {
      // Stale local state pointing at another baby's session: drop it; the
      // restore effect then loads this baby's real open session, if any.
      stopTimer(babyId);
    }
  }, [live, babyId, sessionId, stopTimer, invalidateSleepQueries]);

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
        toast.success("Já existe um sono em andamento — sincronizado ✨");
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
    toast.success(sleepType === "NAP" ? "Soneca iniciada 🌙" : "Sono noturno iniciado 🌙");
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

    if (current.end_time) {
      // Already ended by another caregiver — just sync local state
      stopTimer(babyId);
      invalidateSleepQueries();
      toast.success("Sono já estava finalizado ✨");
      return null;
    }

    // DB start_time is authoritative (it may have been edited by someone else).
    const { error } = await endSleepSession(supabase, sessionId, current.start_time);

    if (error) {
      toast.error(
        isCheckViolation(error)
          ? "Erro ao finalizar o sono. Tente novamente."
          : "Sessão expirada. Faça login novamente."
      );
      return null;
    }

    const endedId = sessionId;
    stopTimer(babyId);
    toast.success("Sono registrado com sucesso ✨");
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
