"use client";

import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
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

  const handleStart = useCallback(async () => {
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
    if (!sessionId) return;

    const { error } = await endSleepSession(supabase, sessionId);

    if (error) {
      toast.error("Erro ao finalizar sessão de sono");
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
