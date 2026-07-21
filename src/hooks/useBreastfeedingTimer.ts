"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  startBreastfeedingSession,
  updateBreastfeedingSides,
  endBreastfeedingSession,
  getActiveBreastfeedingSession,
} from "@/lib/supabase/feedingQueries";
import { useFeedingStore } from "@/store/feedingStore";
import { useBaby } from "@/components/providers/BabyProvider";
import { recordFeedingActivity } from "@/lib/family/recordFeedingActivity";
import { toast } from "sonner";
import type { BreastSide } from "@/types";

function secondsSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

export function useBreastfeedingTimer() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { activeBaby } = useBaby();
  const {
    isRunning,
    sessionId,
    startTime,
    activeSide,
    sideLeftSec,
    sideRightSec,
    sideStartedAt,
    startBreastTimer,
    switchSide,
    stopBreastTimer,
    restoreBreastSession,
  } = useFeedingStore();

  const [liveLeftSec, setLiveLeftSec] = useState(0);
  const [liveRightSec, setLiveRightSec] = useState(0);

  useEffect(() => {
    if (!isRunning || !sideStartedAt) {
      setLiveLeftSec(sideLeftSec);
      setLiveRightSec(sideRightSec);
      return;
    }
    function tick() {
      const extra = secondsSince(sideStartedAt!);
      setLiveLeftSec(activeSide === "LEFT" ? sideLeftSec + extra : sideLeftSec);
      setLiveRightSec(activeSide === "RIGHT" ? sideRightSec + extra : sideRightSec);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, sideStartedAt, activeSide, sideLeftSec, sideRightSec]);

  // Restore active session on mount
  useEffect(() => {
    if (!activeBaby || isRunning) return;
    async function restore() {
      const { data } = await getActiveBreastfeedingSession(supabase, activeBaby!.id);
      if (data) {
        restoreBreastSession(
          data.id,
          data.start_time,
          (data.last_side as BreastSide) ?? "LEFT",
          data.side_left_sec,
          data.side_right_sec
        );
      }
    }
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBaby?.id]);

  // Multi-caregiver sync: if another caregiver ends the session, stop locally
  const { data: liveSession, fetchStatus } = useQuery({
    queryKey: ["active-breastfeeding-live", activeBaby?.id],
    queryFn: async () => {
      if (!activeBaby) return null;
      const { data } = await getActiveBreastfeedingSession(supabase, activeBaby.id);
      return data ?? null;
    },
    enabled: !!activeBaby && isRunning,
    refetchInterval: 20_000,
    staleTime: 0,
  });

  useEffect(() => {
    if (!isRunning || fetchStatus === "fetching") return;
    if (liveSession === null) {
      stopBreastTimer();
      queryClient.invalidateQueries({ queryKey: ["feeding-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["feeding-suggestion"] });
      toast.info("Mamada finalizada por outro cuidador(a)");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveSession, fetchStatus, isRunning]);

  const handleStart = useCallback(async (side: BreastSide = "LEFT") => {
    if (!activeBaby) {
      toast.error("Adicione um bebê primeiro nas configurações");
      return;
    }
    const { data, error } = await startBreastfeedingSession(supabase, activeBaby.id, side);
    if (error || !data) {
      toast.error("Erro ao iniciar mamada");
      return;
    }
    startBreastTimer(data.id, data.start_time, activeBaby.id, side);
    toast.success("Mamada iniciada 🤱");
    void recordFeedingActivity({
      babyId: activeBaby.id,
      babyName: activeBaby.name,
      action: "started",
      feedingType: "BREAST",
      referenceId: data.id,
    });
  }, [activeBaby, supabase, startBreastTimer]);

  const handleSwitchSide = useCallback(async (newSide: BreastSide) => {
    if (!sessionId || newSide === activeSide) return;
    const extra = sideStartedAt ? secondsSince(sideStartedAt) : 0;
    const newLeft = activeSide === "LEFT" ? sideLeftSec + extra : sideLeftSec;
    const newRight = activeSide === "RIGHT" ? sideRightSec + extra : sideRightSec;
    switchSide(newSide, activeSide === "LEFT" ? newLeft : newRight);
    await updateBreastfeedingSides(supabase, sessionId, {
      side_left_sec: newLeft,
      side_right_sec: newRight,
      last_side: newSide,
    });
  }, [sessionId, activeSide, sideStartedAt, sideLeftSec, sideRightSec, supabase, switchSide]);

  const handleStop = useCallback(async () => {
    if (!sessionId) {
      stopBreastTimer();
      return null;
    }
    const extra = sideStartedAt ? secondsSince(sideStartedAt) : 0;
    const finalLeft = activeSide === "LEFT" ? sideLeftSec + extra : sideLeftSec;
    const finalRight = activeSide === "RIGHT" ? sideRightSec + extra : sideRightSec;

    const { error } = await endBreastfeedingSession(supabase, sessionId, {
      side_left_sec: finalLeft,
      side_right_sec: finalRight,
    });

    const endedId = sessionId;
    stopBreastTimer();

    if (error) {
      toast.error("Sessão expirada. Faça login novamente.");
      return null;
    }

    toast.success("Mamada registrada com sucesso ✨");
    queryClient.invalidateQueries({ queryKey: ["feeding-timeline"] });
    queryClient.invalidateQueries({ queryKey: ["feeding-suggestion"] });

    if (activeBaby) {
      void recordFeedingActivity({
        babyId: activeBaby.id,
        babyName: activeBaby.name,
        action: "stopped",
        feedingType: "BREAST",
        referenceId: endedId,
      });
    }

    return { endedSessionId: endedId };
  }, [sessionId, activeSide, sideStartedAt, sideLeftSec, sideRightSec, supabase, stopBreastTimer, queryClient, activeBaby]);

  return {
    isRunning,
    startTime,
    activeSide,
    liveLeftSec,
    liveRightSec,
    handleStart,
    handleSwitchSide,
    handleStop,
  };
}
