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
import { breastTotalsAt, sideOf, sideStartOf } from "@/lib/feeding/breastSides";
import { useSessionClock } from "@/hooks/timer/useSessionClock";
import { useActiveSessionSync } from "@/hooks/timer/useActiveSessionSync";

function secondsSince(iso: string, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
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

  // Sync the shown baby's open session from the DB (mount, baby switch, timer
  // started or dropped): restores it when there is no local timer, and
  // replaces the local counters of the same session with the row's, so the
  // side in progress counts from its real start (`side_started_at`) even if
  // another phone switched sides or an older app version persisted this timer.
  useEffect(() => {
    if (!babyId) return;
    const id = babyId;
    const before = useFeedingStore.getState().timers[id];
    async function sync() {
      const { data } = await getActiveBreastfeedingSession(supabase, id);
      // Don't clobber a timer started or switched locally while the request
      // was in flight, nor a local timer of another session (the poll
      // handles that one).
      if (!data || useFeedingStore.getState().timers[id] !== before) return;
      if (before && before.sessionId !== data.id) return;
      restoreBreastSession(
        id,
        data.id,
        data.start_time,
        sideOf(data),
        data.side_left_sec,
        data.side_right_sec,
        sideStartOf(data)
      );
    }
    void sync();
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
          sideOf(existing),
          existing.side_left_sec,
          existing.side_right_sec,
          sideStartOf(existing)
        );
        toast.success("Já existe uma mamada em andamento, sincronizada");
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
    toast.success("Mamada iniciada");
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
    const prev = useFeedingStore.getState().timers[babyId];
    if (!prev) return;
    const now = Date.now();
    const extra = sideStartedAt ? secondsSince(sideStartedAt, now) : 0;
    const newLeft = activeSide === "LEFT" ? sideLeftSec + extra : sideLeftSec;
    const newRight = activeSide === "RIGHT" ? sideRightSec + extra : sideRightSec;
    const newSideStartedAt = new Date(now).toISOString();
    // Optimistic: the UI switches at once; reverted if the write fails.
    switchSide(babyId, newSide, activeSide === "LEFT" ? newLeft : newRight, newSideStartedAt);
    const switched = useFeedingStore.getState().timers[babyId];

    const { error, updated } = await updateBreastfeedingSides(supabase, sessionId, {
      side_left_sec: newLeft,
      side_right_sec: newRight,
      last_side: newSide,
      side_started_at: newSideStartedAt,
    });
    if (error) {
      // The DB still has the previous side: show it again (unless something
      // else replaced the timer meanwhile).
      if (useFeedingStore.getState().timers[babyId] === switched) {
        useFeedingStore.setState((s) => ({ timers: { ...s.timers, [babyId]: prev } }));
      }
      toast.error("Erro ao trocar o lado. Tente novamente.");
      return;
    }
    if (!updated) {
      // Another caregiver ended (or deleted) the session: nothing was written.
      stopBreastTimer(babyId);
      invalidateFeedingQueries();
      toast.info("Mamada finalizada por outro cuidador(a)");
    }
  }, [babyId, sessionId, activeSide, sideStartedAt, sideLeftSec, sideRightSec, supabase, switchSide, stopBreastTimer, invalidateFeedingQueries]);

  const handleStop = useCallback(async () => {
    if (!babyId) return null;
    if (!sessionId) {
      stopBreastTimer(babyId);
      return null;
    }
    // Read the row first: its start_time is authoritative for the end-time
    // clamp, its sides give the totals, and it tells whether another
    // caregiver already ended it.
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
      if (alreadyEnded) toast.success("Mamada já estava finalizada");
    };
    if (!current || current.end_time) {
      syncEnded(!!current);
      return null;
    }

    // The row is the shared truth (every switch is written to it, from any
    // phone): stored totals plus the side in progress since side_started_at.
    const totals = breastTotalsAt(current);
    const { error } = await endBreastfeedingSession(supabase, sessionId, {
      start_time: current.start_time,
      side_left_sec: totals.left,
      side_right_sec: totals.right,
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

    toast.success("Mamada registrada com sucesso");
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
  }, [babyId, sessionId, supabase, stopBreastTimer, invalidateFeedingQueries, activeBaby]);

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
