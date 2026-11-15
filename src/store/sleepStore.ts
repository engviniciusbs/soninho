import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SleepType = "NAP" | "NIGHT_SLEEP";

/** Local, not-yet-saved inputs of the sleep form (type + notes + environment). */
export interface SleepDraft {
  sleepType: SleepType;
  notes: string;
  roomTemp: number | null;
  weatherCondition: string | null;
  sleepSackType: string | null;
  sleepSackTog: number | null;
}

/** A running sleep timer of one baby, with that run's local drafts. */
export interface SleepTimerEntry extends SleepDraft {
  sessionId: string;
  startTime: string;
}

export const EMPTY_SLEEP_DRAFT: SleepDraft = {
  sleepType: "NAP",
  notes: "",
  roomTemp: null,
  weatherCondition: null,
  sleepSackType: null,
  sleepSackTog: null,
};

export interface SleepPersistedState {
  /**
   * The baby selected in the UI (read by BabyProvider). It is NOT the owner of
   * any timer: timers are keyed by baby id in `timers`.
   */
  activeBabyId: string | null;
  timers: Record<string, SleepTimerEntry>;
  /** Pre-start form draft, used while the shown baby has no running timer. */
  draft: SleepDraft;
}

interface SleepStore extends SleepPersistedState {
  startTimer: (babyId: string, sessionId: string, startTime: string, type: SleepType) => void;
  stopTimer: (babyId: string) => void;
  /** Sync to an existing DB session (e.g. another caregiver's): local drafts are discarded. */
  restoreFromSession: (babyId: string, sessionId: string, startTime: string, type: SleepType) => void;
  /** Edits the running timer of `babyId` if there is one, otherwise the pre-start draft. */
  updateDraft: (babyId: string | null | undefined, patch: Partial<SleepDraft>) => void;
  setActiveBabyId: (id: string | null) => void;
}

export const SLEEP_STORE_VERSION = 1;

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * persist `migrate`. Version 0 was a single global timer:
 * `{ isRunning, sessionId, startTime, sleepType, notes, activeBabyId, roomTemp,
 * weatherCondition, sleepSackType, sleepSackTog }`. A running v0 timer becomes
 * `timers[activeBabyId]` (carrying its drafts); without `activeBabyId` it is
 * dropped — the DB restore on mount brings it back for the right baby.
 */
export function migrateSleepState(persisted: unknown, version: number): SleepPersistedState {
  const p = (persisted && typeof persisted === "object" ? persisted : {}) as Record<string, unknown>;

  if (version >= SLEEP_STORE_VERSION) {
    return {
      activeBabyId: str(p.activeBabyId),
      timers: (p.timers && typeof p.timers === "object" ? p.timers : {}) as Record<string, SleepTimerEntry>,
      draft: { ...EMPTY_SLEEP_DRAFT, ...(p.draft as Partial<SleepDraft> | undefined) },
    };
  }

  const drafts: SleepDraft = {
    sleepType: p.sleepType === "NIGHT_SLEEP" ? "NIGHT_SLEEP" : "NAP",
    notes: typeof p.notes === "string" ? p.notes : "",
    roomTemp: num(p.roomTemp),
    weatherCondition: str(p.weatherCondition),
    sleepSackType: str(p.sleepSackType),
    sleepSackTog: num(p.sleepSackTog),
  };
  const activeBabyId = str(p.activeBabyId);
  const sessionId = str(p.sessionId);
  const startTime = str(p.startTime);

  if (p.isRunning === true && sessionId && startTime && activeBabyId) {
    return {
      activeBabyId,
      timers: { [activeBabyId]: { sessionId, startTime, ...drafts } },
      draft: { ...EMPTY_SLEEP_DRAFT, sleepType: drafts.sleepType },
    };
  }
  return { activeBabyId, timers: {}, draft: drafts };
}

export const useSleepStore = create<SleepStore>()(
  persist(
    (set) => ({
      activeBabyId: null,
      timers: {},
      draft: { ...EMPTY_SLEEP_DRAFT },

      startTimer: (babyId, sessionId, startTime, type) =>
        set((s) => ({
          timers: {
            ...s.timers,
            [babyId]: { ...s.draft, sessionId, startTime, sleepType: type },
          },
          // The draft was used for this run; keep only the chosen type.
          draft: { ...EMPTY_SLEEP_DRAFT, sleepType: type },
        })),

      stopTimer: (babyId) =>
        set((s) => {
          if (!(babyId in s.timers)) return s;
          const timers = { ...s.timers };
          delete timers[babyId];
          return { timers };
        }),

      restoreFromSession: (babyId, sessionId, startTime, type) =>
        set((s) => ({
          timers: {
            ...s.timers,
            [babyId]: { ...EMPTY_SLEEP_DRAFT, sessionId, startTime, sleepType: type },
          },
          draft: { ...EMPTY_SLEEP_DRAFT },
        })),

      updateDraft: (babyId, patch) =>
        set((s) => {
          const running = babyId ? s.timers[babyId] : undefined;
          if (babyId && running) {
            return { timers: { ...s.timers, [babyId]: { ...running, ...patch } } };
          }
          return { draft: { ...s.draft, ...patch } };
        }),

      setActiveBabyId: (id) => set({ activeBabyId: id }),
    }),
    {
      name: "soninho-timer",
      version: SLEEP_STORE_VERSION,
      migrate: migrateSleepState,
      partialize: (s): SleepPersistedState => ({
        activeBabyId: s.activeBabyId,
        timers: s.timers,
        draft: s.draft,
      }),
    }
  )
);

/** The running sleep timer of `babyId`, or null. Stable reference (safe as a selector). */
export function useActiveSleepTimer(babyId: string | null | undefined): SleepTimerEntry | null {
  return useSleepStore((s) => (babyId ? s.timers[babyId] ?? null : null));
}
