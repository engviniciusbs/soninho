"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  startSleepSession,
  endSleepSession,
  getActiveSleepSession,
} from "@/lib/supabase/queries";
import { useSleepStore } from "@/store/sleepStore";
import { useBaby } from "@/components/providers/BabyProvider";
import { formatElapsed } from "@/lib/utils";
import { toast } from "sonner";

export function useSleepTimer() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { activeBaby } = useBaby();
  const {
    isRunning,
    sessionId,
    startTime,
    sleepType,
    notes,
    roomTemp,
    weatherCondition,
    sleepSackType,
    sleepSackTog,
    startTimer,
    stopTimer,
    setSleepType,
    setNotes,
    setRoomTemp,
    setWeatherCondition,
    setSleepSackType,
    setSleepSackTog,
    restoreFromSession,
  } = useSleepStore();

  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (!isRunning || !startTime) {
      setElapsed("00:00:00");
      return;
    }
    const interval = setInterval(() => {
      setElapsed(formatElapsed(startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  // Restore timer state from Supabase on mount
  useEffect(() => {
    if (!activeBaby || isRunning) return;

    async function restore() {
      const { data } = await getActiveSleepSession(supabase, activeBaby!.id);
      if (data) {
        restoreFromSession(
          data.id,
          data.start_time,
          data.type as "NAP" | "NIGHT_SLEEP"
        );
      }
    }
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBaby?.id]);

  // Poll the active session every 20s while running.
  // If it disappears (another caregiver stopped it), auto-stop the local timer.
  const { data: liveSession, fetchStatus } = useQuery({
    queryKey: ["active-session-live", activeBaby?.id],
    queryFn: async () => {
      if (!activeBaby) return null;
      const { data } = await getActiveSleepSession(supabase, activeBaby.id);
      return data ?? null;
    },
    enabled: !!activeBaby && isRunning,
    refetchInterval: 20_000,
    staleTime: 0,
  });

  useEffect(() => {
    // Only act once the query has settled (not on the initial undefined state)
    if (!isRunning || fetchStatus === "fetching") return;
    if (liveSession === null) {
      stopTimer();
      queryClient.invalidateQueries({ queryKey: ["sleep-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["last-session"] });
      queryClient.invalidateQueries({ queryKey: ["ai-suggestion"] });
      toast.info("Sono finalizado por outro cuidador(a)");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveSession, fetchStatus, isRunning]);

  const handleStart = useCallback(async (startTimeIso?: string) => {
    if (!activeBaby) {
      toast.error("Adicione um bebê primeiro nas configurações");
      return;
    }

    const { data, error } = await startSleepSession(
      supabase,
      activeBaby.id,
      sleepType,
      {
        notes: notes || undefined,
        room_temp_celsius: roomTemp,
        weather_condition: weatherCondition,
        sleep_sack_type: sleepSackType,
        sleep_sack_tog: sleepSackTog,
        start_time: startTimeIso,
      }
    );

    if (error) {
      toast.error("Erro ao iniciar sessão de sono");
      return;
    }

    if (data) {
      startTimer(data.id, data.start_time, sleepType, activeBaby.id);
      toast.success(
        sleepType === "NAP"
          ? "Soneca iniciada 🌙"
          : "Sono noturno iniciado 🌙"
      );
    }
  }, [activeBaby, sleepType, notes, roomTemp, weatherCondition, sleepSackType, sleepSackTog, supabase, startTimer]);

  const handleStop = useCallback(async () => {
    if (!sessionId) {
      stopTimer();
      return;
    }

    // Verify the session still exists and hasn't already been ended.
    // This covers: another user stopped it, stale Zustand state, or auth cookie issues.
    const { data: current } = await supabase
      .from("sleep_sessions")
      .select("id, end_time")
      .eq("id", sessionId)
      .maybeSingle();

    if (!current) {
      // Session not found (deleted or never created) — clean up silently
      stopTimer();
      queryClient.invalidateQueries({ queryKey: ["sleep-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["last-session"] });
      queryClient.invalidateQueries({ queryKey: ["ai-suggestion"] });
      return;
    }

    if (current.end_time) {
      // Already ended by another caregiver — just sync local state
      stopTimer();
      queryClient.invalidateQueries({ queryKey: ["sleep-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["last-session"] });
      queryClient.invalidateQueries({ queryKey: ["ai-suggestion"] });
      toast.success("Sono já estava finalizado ✨");
      return;
    }

    const { error } = await endSleepSession(supabase, sessionId);

    if (error) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    stopTimer();
    toast.success("Sono registrado com sucesso ✨");
    queryClient.invalidateQueries({ queryKey: ["sleep-sessions"] });
    queryClient.invalidateQueries({ queryKey: ["last-session"] });
    queryClient.invalidateQueries({ queryKey: ["ai-suggestion"] });
  }, [sessionId, supabase, stopTimer, queryClient]);

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
