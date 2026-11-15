"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  startBreastfeedingSession,
  updateBreastfeedingSides,
  endBreastfeedingSession,
  getActiveBreastfeedingSession,
  getBreastfeedingSessionStatus,
} from "@/lib/supabase/feedingQueries";
import {
  classifyLiveSession,
  isCheckViolation,
  isUniqueViolation,
} from "@/lib/supabase/sessionConflict";
import { useFeedingStore, useActiveBreastTimer } from "@/store/feedingStore";
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
  const babyId = activeBaby?.id ?? null;

  // Timers are per baby: only the shown baby's running timer is used here.
  const timer = useActiveBreastTimer(babyId);
  const startBreastTimer = useFeedingStore((s) => s.startBreastTimer);
  const switchSide = useFeedingStore((s) => s.switchSide);
  const stopBreastTimer = useFeedingStore((s) => s.stopBreastTimer);
  const restoreBreastSession = useFeedingStore((s) => s.restoreBreastSession);

  const isRunning = timer !== null;
  const sessionId = timer?.sessionId ?? null;
  const startTime = timer?.startTime ?? null;
  const activeSide: BreastSide = timer?.activeSide ?? "LEFT";
  const sideLeftSec = timer?.sideLeftSec ?? 0;
  const sideRightSec = timer?.sideRightSec ?? 0;
  const sideStartedAt = timer?.sideStartedAt ?? null;

  // Last interval tick, tagged with the side segment it was computed for.
  // While stopped (or before the first tick of a segment) the live counters
  // are the stored totals, derived in render instead of copied by an effect.
  const [tick, setTick] = useState<{
    sideStartedAt: string;
    activeSide: BreastSide;
    left: number;
    right: number;
  } | null>(null);

  const ticking = isRunning && !!sideStartedAt;
  const tickIsCurrent =
    ticking && tick?.sideStartedAt === sideStartedAt && tick.activeSide === activeSide;
  const liveLeftSec = tickIsCurrent ? tick.left : sideLeftSec;
  const liveRightSec = tickIsCurrent ? tick.right : sideRightSec;

  // TODO(PR4): replace this interval + immediate tick() with a shared clock via
  // useSyncExternalStore so the live counters can be fully derived in render.
  useEffect(() => {
    if (!isRunning || !sideStartedAt) return;
    const startedAt = sideStartedAt;
    function tick() {
      const extra = secondsSince(startedAt);
      setTick({
        sideStartedAt: startedAt,
        activeSide,
        left: activeSide === "LEFT" ? sideLeftSec + extra : sideLeftSec,
        right: activeSide === "RIGHT" ? sideRightSec + extra : sideRightSec,
      });
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, sideStartedAt, activeSide, sideLeftSec, sideRightSec]);

  // Restore the shown baby's open session when it has no local timer
  // (mount, baby switch, or after a local timer was dropped).
  useEffect(() => {
    if (!babyId || isRunning) return;
    const id = babyId;
    async function restore() {
      const { data } = await getActiveBreastfeedingSession(supabase, id);
      // Don't clobber a timer started locally while the request was in flight.
      if (data && !useFeedingStore.getState().timers[id]) {
        restoreBreastSession(
          id,
          data.id,
          data.start_time,
          (data.last_side as BreastSide) ?? "LEFT",
          data.side_left_sec,
          data.side_right_sec
        );
      }
    }
    void restore();
  }, [babyId, isRunning, supabase, restoreBreastSession]);

  // Multi-caregiver sync: poll the running session (by id) every 20s. Only an
  // error-free response can stop the local timer; a network error keeps it.
  const { data: live } = useQuery({
    queryKey: ["active-breastfeeding-live", babyId, sessionId],
    queryFn: async () => {
      const result = await getBreastfeedingSessionStatus(supabase, sessionId!);
      return { sessionId: sessionId!, status: classifyLiveSession(result, babyId!) };
    },
    enabled: !!babyId && !!sessionId,
    refetchInterval: 20_000,
    staleTime: 0,
  });

  useEffect(() => {
    if (!babyId || !live || live.sessionId !== sessionId) return;
    if (live.status === "ended") {
      stopBreastTimer(babyId);
      queryClient.invalidateQueries({ queryKey: ["feeding-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["feeding-suggestion"] });
      toast.info("Mamada finalizada por outro cuidador(a)");
    } else if (live.status === "mismatch") {
      // Stale local state pointing at another baby's session: drop it.
      stopBreastTimer(babyId);
    }
  }, [live, babyId, sessionId, stopBreastTimer, queryClient]);

  const handleStart = useCallback(async (side: BreastSide = "LEFT") => {
    if (!activeBaby) {
      toast.error("Adicione um bebê primeiro nas configurações");
      return;
    }
    const baby = activeBaby;
    let { data, error } = await startBreastfeedingSession(supabase, baby.id, side);
    if (error && isUniqueViolation(error)) {
      // Another caregiver already has an open session: sync to it.
      const { data: existing } = await getActiveBreastfeedingSession(supabase, baby.id);
      if (existing) {
        restoreBreastSession(
          baby.id,
          existing.id,
          existing.start_time,
          (existing.last_side as BreastSide) ?? "LEFT",
          existing.side_left_sec,
          existing.side_right_sec
        );
        toast.success("Já existe uma mamada em andamento — sincronizada 🤱");
        return;
      }
      // The conflicting session was closed in the meantime: try once more.
      ({ data, error } = await startBreastfeedingSession(supabase, baby.id, side));
    }
    if (error || !data) {
      toast.error("Erro ao iniciar mamada");
      return;
    }
    startBreastTimer(baby.id, data.id, data.start_time, side);
    toast.success("Mamada iniciada 🤱");
    void recordFeedingActivity({
      babyId: baby.id,
      babyName: baby.name,
      action: "started",
      feedingType: "BREAST",
      referenceId: data.id,
    });
  }, [activeBaby, supabase, startBreastTimer, restoreBreastSession]);

  const handleSwitchSide = useCallback(async (newSide: BreastSide) => {
    if (!babyId || !sessionId || newSide === activeSide) return;
    const extra = sideStartedAt ? secondsSince(sideStartedAt) : 0;
    const newLeft = activeSide === "LEFT" ? sideLeftSec + extra : sideLeftSec;
    const newRight = activeSide === "RIGHT" ? sideRightSec + extra : sideRightSec;
    switchSide(babyId, newSide, activeSide === "LEFT" ? newLeft : newRight);
    await updateBreastfeedingSides(supabase, sessionId, {
      side_left_sec: newLeft,
      side_right_sec: newRight,
      last_side: newSide,
    });
  }, [babyId, sessionId, activeSide, sideStartedAt, sideLeftSec, sideRightSec, supabase, switchSide]);

  const handleStop = useCallback(async () => {
    if (!babyId) return null;
    if (!sessionId) {
      stopBreastTimer(babyId);
      return null;
    }
    const extra = sideStartedAt ? secondsSince(sideStartedAt) : 0;
    const finalLeft = activeSide === "LEFT" ? sideLeftSec + extra : sideLeftSec;
    const finalRight = activeSide === "RIGHT" ? sideRightSec + extra : sideRightSec;

    // Read the row first: its start_time is authoritative for the end-time
    // clamp, and it tells whether another caregiver already ended it.
    const { data: current, error: readError } = await getBreastfeedingSessionStatus(supabase, sessionId);
    if (readError) {
      // Network/auth failure: keep the timer, the session is still open.
      toast.error("Erro ao finalizar a mamada. Tente novamente.");
      return null;
    }
    if (!current || current.end_time) {
      stopBreastTimer(babyId);
      queryClient.invalidateQueries({ queryKey: ["feeding-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["feeding-suggestion"] });
      if (current) toast.success("Mamada já estava finalizada ✨");
      return null;
    }

    const { error } = await endBreastfeedingSession(supabase, sessionId, {
      start_time: current.start_time,
      side_left_sec: finalLeft,
      side_right_sec: finalRight,
    });

    if (error) {
      // Keep the local timer: the session is still open in the DB.
      toast.error(
        isCheckViolation(error)
          ? "Erro ao finalizar a mamada. Tente novamente."
          : "Sessão expirada. Faça login novamente."
      );
      return null;
    }

    const endedId = sessionId;
    stopBreastTimer(babyId);

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
  }, [babyId, sessionId, activeSide, sideStartedAt, sideLeftSec, sideRightSec, supabase, stopBreastTimer, queryClient, activeBaby]);

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
