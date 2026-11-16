"use client";

import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  startBreastfeedingSession,
  updateBreastfeedingSides,
  endBreastfeedingSession,
  getActiveBreastfeedingSession,
  getBreastfeedingSessionStatus,
} from "@/lib/supabase/feedingQueries";
import { classifyEndResult, isUniqueViolation } from "@/lib/supabase/sessionConflict";
import { useFeedingStore, useActiveBreastTimer } from "@/store/feedingStore";
import { useBaby } from "@/components/providers/BabyProvider";
import { recordFeedingActivity } from "@/lib/family/recordFeedingActivity";
import { toast } from "sonner";
import type { BreastSide } from "@/types";
import { useSessionClock } from "@/hooks/timer/useSessionClock";
import { useActiveSessionSync } from "@/hooks/timer/useActiveSessionSync";

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

  // Live counters, derived in render from the shared clock: the stored total
  // of each side plus, for the active side, the seconds of the current
  // segment. While stopped (or before the clock's first value) they are the
  // stored totals.
  const { elapsedSec: segmentSec } = useSessionClock(isRunning ? sideStartedAt : null);
  const extraSec = segmentSec ?? 0;
  const liveLeftSec = activeSide === "LEFT" ? sideLeftSec + extraSec : sideLeftSec;
  const liveRightSec = activeSide === "RIGHT" ? sideRightSec + extraSec : sideRightSec;

  const invalidateFeedingQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["feeding-timeline"] });
    queryClient.invalidateQueries({ queryKey: ["feeding-suggestion"] });
  }, [queryClient]);

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

  useActiveSessionSync({
    queryKey: "active-breastfeeding-live",
    babyId,
    sessionId,
    fetchStatus: (id) => getBreastfeedingSessionStatus(supabase, id),
    onEnded: () => {
      if (!babyId) return;
      stopBreastTimer(babyId);
      invalidateFeedingQueries();
      toast.info("Mamada finalizada por outro cuidador(a)");
    },
    onMismatch: () => {
      // Stale local state pointing at another baby's session: drop it.
      if (babyId) stopBreastTimer(babyId);
    },
  });

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
    if (current && current.baby_id !== babyId) {
      // Stale local state pointing at another baby's session (e.g. migrated
      // v0 state): drop this baby's timer, never end that session.
      stopBreastTimer(babyId);
      return null;
    }
    const syncEnded = (alreadyEnded: boolean) => {
      stopBreastTimer(babyId);
      invalidateFeedingQueries();
      if (alreadyEnded) toast.success("Mamada já estava finalizada ✨");
    };
    if (!current || current.end_time) {
      syncEnded(!!current);
      return null;
    }

    const { error } = await endBreastfeedingSession(supabase, sessionId, {
      start_time: current.start_time,
      side_left_sec: finalLeft,
      side_right_sec: finalRight,
    });
    const outcome = classifyEndResult(error);

    if (outcome === "already-ended") {
      // Lost the race (double tap / another caregiver): no second "stopped".
      syncEnded(true);
      return null;
    }
    if (outcome !== "ok") {
      // Keep the local timer: the session is still open in the DB.
      toast.error(
        outcome === "check"
          ? "Erro ao finalizar a mamada. Tente novamente."
          : "Sessão expirada. Faça login novamente."
      );
      return null;
    }

    const endedId = sessionId;
    stopBreastTimer(babyId);

    toast.success("Mamada registrada com sucesso ✨");
    invalidateFeedingQueries();

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
  }, [babyId, sessionId, activeSide, sideStartedAt, sideLeftSec, sideRightSec, supabase, stopBreastTimer, invalidateFeedingQueries, activeBaby]);

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
