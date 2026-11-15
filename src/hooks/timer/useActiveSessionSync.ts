"use client";

import { useEffect, useEffectEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  classifyLiveSession,
  type LiveSessionResult,
  type LiveSessionRow,
} from "@/lib/supabase/sessionConflict";

export const ACTIVE_SESSION_POLL_MS = 20_000;

/**
 * Multi-caregiver sync of a running timer: polls the session row (by id) every
 * `intervalMs` while `babyId` and `sessionId` are set, and reacts to the
 * classification of {@link classifyLiveSession}:
 * - "ended" (row gone or end_time filled by someone else) → `onEnded`;
 * - "mismatch" (row belongs to another baby: stale local state) → `onMismatch`;
 * - "running" / "unknown" (network or auth error) → nothing: only an error-free
 *   response can stop the local timer.
 *
 * Each result is tagged with the session it was fetched for, so a late answer
 * about a previous session never touches the current one.
 */
export function useActiveSessionSync<T extends LiveSessionRow>(opts: {
  /** First element of the react-query key (one per session kind). */
  queryKey: string;
  babyId: string | null;
  sessionId: string | null;
  fetchStatus: (sessionId: string) => Promise<LiveSessionResult<T>>;
  onEnded: () => void;
  onMismatch: () => void;
  intervalMs?: number;
}): void {
  const { queryKey, babyId, sessionId, fetchStatus, intervalMs = ACTIVE_SESSION_POLL_MS } = opts;

  const { data: live } = useQuery({
    queryKey: [queryKey, babyId, sessionId],
    queryFn: async () => {
      // `enabled` guarantees both ids are set when this runs.
      const id = sessionId as string;
      const result = await fetchStatus(id);
      return { sessionId: id, status: classifyLiveSession(result, babyId as string) };
    },
    enabled: !!babyId && !!sessionId,
    refetchInterval: intervalMs,
    staleTime: 0,
  });

  const onEnded = useEffectEvent(opts.onEnded);
  const onMismatch = useEffectEvent(opts.onMismatch);

  useEffect(() => {
    if (!babyId || !live || live.sessionId !== sessionId) return;
    if (live.status === "ended") onEnded();
    else if (live.status === "mismatch") onMismatch();
  }, [live, babyId, sessionId]);
}
