import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BreastSide } from "@/types";

/** A running breastfeeding timer of one baby. */
export interface BreastTimerEntry {
  sessionId: string;
  startTime: string;
  activeSide: BreastSide;
  /** Seconds accumulated before the current in-progress side interval. */
  sideLeftSec: number;
  sideRightSec: number;
  /** When the currently active side interval started (for live elapsed calc). */
  sideStartedAt: string | null;
}

export interface FeedingPersistedState {
  timers: Record<string, BreastTimerEntry>;
}

interface FeedingStore extends FeedingPersistedState {
  startBreastTimer: (babyId: string, sessionId: string, startTime: string, side: BreastSide) => void;
  switchSide: (babyId: string, side: BreastSide, accumulatedSec: number) => void;
  stopBreastTimer: (babyId: string) => void;
  /** Sync to an existing DB session (e.g. another caregiver's): local counters are replaced. */
  restoreBreastSession: (
    babyId: string,
    sessionId: string,
    startTime: string,
    side: BreastSide,
    sideLeftSec: number,
    sideRightSec: number
  ) => void;
}

export const FEEDING_STORE_VERSION = 1;

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function secs(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * persist `migrate`. Version 0 was a single global timer:
 * `{ isRunning, sessionId, startTime, activeBabyId, activeSide, sideLeftSec,
 * sideRightSec, sideStartedAt }`. A running v0 timer becomes
 * `timers[activeBabyId]`; without `activeBabyId` it is dropped (the DB restore
 * on mount brings it back for the right baby).
 */
export function migrateFeedingState(persisted: unknown, version: number): FeedingPersistedState {
  const p = (persisted && typeof persisted === "object" ? persisted : {}) as Record<string, unknown>;

  if (version >= FEEDING_STORE_VERSION) {
    return {
      timers: (p.timers && typeof p.timers === "object" ? p.timers : {}) as Record<string, BreastTimerEntry>,
    };
  }

  const babyId = str(p.activeBabyId);
  const sessionId = str(p.sessionId);
  const startTime = str(p.startTime);
  if (p.isRunning !== true || !babyId || !sessionId || !startTime) return { timers: {} };

  return {
    timers: {
      [babyId]: {
        sessionId,
        startTime,
        activeSide: p.activeSide === "RIGHT" ? "RIGHT" : "LEFT",
        sideLeftSec: secs(p.sideLeftSec),
        sideRightSec: secs(p.sideRightSec),
        sideStartedAt: str(p.sideStartedAt),
      },
    },
  };
}

export const useFeedingStore = create<FeedingStore>()(
  persist(
    (set) => ({
      timers: {},

      startBreastTimer: (babyId, sessionId, startTime, side) =>
        set((s) => ({
          timers: {
            ...s.timers,
            [babyId]: {
              sessionId,
              startTime,
              activeSide: side,
              sideLeftSec: 0,
              sideRightSec: 0,
              sideStartedAt: startTime,
            },
          },
        })),

      switchSide: (babyId, side, accumulatedSec) =>
        set((s) => {
          const t = s.timers[babyId];
          if (!t) return s;
          return {
            timers: {
              ...s.timers,
              [babyId]: {
                ...t,
                activeSide: side,
                sideStartedAt: new Date().toISOString(),
                sideLeftSec: t.activeSide === "LEFT" ? accumulatedSec : t.sideLeftSec,
                sideRightSec: t.activeSide === "RIGHT" ? accumulatedSec : t.sideRightSec,
              },
            },
          };
        }),

      stopBreastTimer: (babyId) =>
        set((s) => {
          if (!(babyId in s.timers)) return s;
          const timers = { ...s.timers };
          delete timers[babyId];
          return { timers };
        }),

      restoreBreastSession: (babyId, sessionId, startTime, side, sideLeftSec, sideRightSec) =>
        set((s) => ({
          timers: {
            ...s.timers,
            [babyId]: {
              sessionId,
              startTime,
              activeSide: side,
              sideLeftSec,
              sideRightSec,
              sideStartedAt: new Date().toISOString(),
            },
          },
        })),
    }),
    {
      name: "soninho-feeding-timer",
      version: FEEDING_STORE_VERSION,
      migrate: migrateFeedingState,
      partialize: (s): FeedingPersistedState => ({ timers: s.timers }),
    }
  )
);

/** The running breastfeeding timer of `babyId`, or null. Stable reference (safe as a selector). */
export function useActiveBreastTimer(babyId: string | null | undefined): BreastTimerEntry | null {
  return useFeedingStore((s) => (babyId ? s.timers[babyId] ?? null : null));
}
