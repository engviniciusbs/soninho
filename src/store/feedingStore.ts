import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BreastSide } from "@/types";

interface BreastfeedingTimerState {
  isRunning: boolean;
  sessionId: string | null;
  startTime: string | null;
  activeBabyId: string | null;
  activeSide: BreastSide;
  /** Seconds accumulated before the current in-progress side interval. */
  sideLeftSec: number;
  sideRightSec: number;
  /** When the currently active side interval started (for live elapsed calc). */
  sideStartedAt: string | null;
}

interface FeedingStore extends BreastfeedingTimerState {
  startBreastTimer: (
    sessionId: string,
    startTime: string,
    babyId: string,
    side: BreastSide
  ) => void;
  switchSide: (side: BreastSide, accumulatedSec: number) => void;
  stopBreastTimer: () => void;
  restoreBreastSession: (
    sessionId: string,
    startTime: string,
    side: BreastSide,
    sideLeftSec: number,
    sideRightSec: number
  ) => void;
}

export const useFeedingStore = create<FeedingStore>()(
  persist(
    (set) => ({
      isRunning: false,
      sessionId: null,
      startTime: null,
      activeBabyId: null,
      activeSide: "LEFT",
      sideLeftSec: 0,
      sideRightSec: 0,
      sideStartedAt: null,

      startBreastTimer: (sessionId, startTime, babyId, side) =>
        set({
          isRunning: true,
          sessionId,
          startTime,
          activeBabyId: babyId,
          activeSide: side,
          sideLeftSec: 0,
          sideRightSec: 0,
          sideStartedAt: startTime,
        }),

      switchSide: (side, accumulatedSec) =>
        set((state) => ({
          activeSide: side,
          sideStartedAt: new Date().toISOString(),
          sideLeftSec: state.activeSide === "LEFT" ? accumulatedSec : state.sideLeftSec,
          sideRightSec: state.activeSide === "RIGHT" ? accumulatedSec : state.sideRightSec,
        })),

      stopBreastTimer: () =>
        set({
          isRunning: false,
          sessionId: null,
          startTime: null,
          activeSide: "LEFT",
          sideLeftSec: 0,
          sideRightSec: 0,
          sideStartedAt: null,
        }),

      restoreBreastSession: (sessionId, startTime, side, sideLeftSec, sideRightSec) =>
        set({
          isRunning: true,
          sessionId,
          startTime,
          activeSide: side,
          sideLeftSec,
          sideRightSec,
          sideStartedAt: new Date().toISOString(),
        }),
    }),
    { name: "soninho-feeding-timer" }
  )
);
