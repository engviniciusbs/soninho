import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal in-memory localStorage so the persist middleware has a storage
// (vitest runs in node) and does not warn.
const memory = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k),
  clear: () => memory.clear(),
  key: () => null,
  length: 0,
};
// zustand's persist reads `window.localStorage`.
vi.stubGlobal("window", { localStorage: localStorageStub });

const { useSleepStore, migrateSleepState, EMPTY_SLEEP_DRAFT } = await import("./sleepStore");

/** Exactly the keys version 0 of "soninho-timer" persisted (whole state). */
function v0State(overrides: Record<string, unknown> = {}) {
  return {
    isRunning: true,
    sessionId: "S1",
    startTime: "2026-11-15T10:00:00.000Z",
    sleepType: "NIGHT_SLEEP",
    notes: "chorou um pouco",
    activeBabyId: "B1",
    roomTemp: 22,
    weatherCondition: "rain",
    sleepSackType: "sack",
    sleepSackTog: 1.0,
    ...overrides,
  };
}

beforeEach(() => {
  memory.clear();
  useSleepStore.setState({
    activeBabyId: null,
    timers: {},
    draft: { ...EMPTY_SLEEP_DRAFT },
  });
});

describe("migrateSleepState", () => {
  it("migrates_v0_running_timer", () => {
    const migrated = migrateSleepState(v0State(), 0);
    expect(migrated.activeBabyId).toBe("B1");
    expect(migrated.timers).toEqual({
      B1: {
        sessionId: "S1",
        startTime: "2026-11-15T10:00:00.000Z",
        sleepType: "NIGHT_SLEEP",
        notes: "chorou um pouco",
        roomTemp: 22,
        weatherCondition: "rain",
        sleepSackType: "sack",
        sleepSackTog: 1.0,
      },
    });
    // The drafts moved into the running timer; the pre-start draft is fresh.
    expect(migrated.draft).toEqual({ ...EMPTY_SLEEP_DRAFT, sleepType: "NIGHT_SLEEP" });
    expect(migrated).not.toHaveProperty("isRunning");
    expect(migrated).not.toHaveProperty("sessionId");
  });

  it("migrates_v0_without_baby_drops_timer", () => {
    const migrated = migrateSleepState(v0State({ activeBabyId: null }), 0);
    expect(migrated.timers).toEqual({});
    expect(migrated.activeBabyId).toBeNull();
  });

  it("keeps the v0 drafts as the pre-start draft when no timer was running", () => {
    const migrated = migrateSleepState(
      v0State({ isRunning: false, sessionId: null, startTime: null }),
      0
    );
    expect(migrated.timers).toEqual({});
    expect(migrated.activeBabyId).toBe("B1");
    expect(migrated.draft).toEqual({
      sleepType: "NIGHT_SLEEP",
      notes: "chorou um pouco",
      roomTemp: 22,
      weatherCondition: "rain",
      sleepSackType: "sack",
      sleepSackTog: 1.0,
    });
  });

  it("drops a v0 running flag without a session id or start time", () => {
    expect(migrateSleepState(v0State({ sessionId: null }), 0).timers).toEqual({});
    expect(migrateSleepState(v0State({ startTime: null }), 0).timers).toEqual({});
  });

  it("tolerates garbage persisted state", () => {
    for (const junk of [null, undefined, 42, "x", { sleepType: "WAT", roomTemp: "hot" }]) {
      const migrated = migrateSleepState(junk, 0);
      expect(migrated.timers).toEqual({});
      expect(migrated.activeBabyId).toBeNull();
      expect(migrated.draft).toEqual(EMPTY_SLEEP_DRAFT);
    }
  });

  it("rehydrates a v0 localStorage entry through persist", async () => {
    memory.set("soninho-timer", JSON.stringify({ state: v0State(), version: 0 }));
    await useSleepStore.persist.rehydrate();
    const s = useSleepStore.getState();
    expect(s.timers.B1?.sessionId).toBe("S1");
    expect(s.activeBabyId).toBe("B1");
    expect(JSON.parse(memory.get("soninho-timer")!).version).toBe(1);
  });
});

describe("sleep timer actions", () => {
  it("timers_are_independent_per_baby", () => {
    const s = useSleepStore.getState();
    s.startTimer("B1", "S1", "2026-11-15T10:00:00.000Z", "NAP");
    s.startTimer("B2", "S2", "2026-11-15T11:00:00.000Z", "NIGHT_SLEEP");
    useSleepStore.getState().stopTimer("B2");
    const { timers } = useSleepStore.getState();
    expect(timers.B2).toBeUndefined();
    expect(timers.B1).toMatchObject({
      sessionId: "S1",
      startTime: "2026-11-15T10:00:00.000Z",
      sleepType: "NAP",
    });
  });

  it("startTimer moves the pre-start draft into the baby's timer", () => {
    const s = useSleepStore.getState();
    s.updateDraft("B1", { notes: "n", roomTemp: 21, sleepType: "NIGHT_SLEEP" });
    useSleepStore.getState().startTimer("B1", "S1", "2026-11-15T10:00:00.000Z", "NIGHT_SLEEP");
    const st = useSleepStore.getState();
    expect(st.timers.B1).toMatchObject({ notes: "n", roomTemp: 21, sleepType: "NIGHT_SLEEP" });
    expect(st.draft).toEqual({ ...EMPTY_SLEEP_DRAFT, sleepType: "NIGHT_SLEEP" });
  });

  it("updateDraft edits the running timer of that baby only", () => {
    const s = useSleepStore.getState();
    s.startTimer("B1", "S1", "2026-11-15T10:00:00.000Z", "NAP");
    useSleepStore.getState().updateDraft("B1", { notes: "acordou" });
    useSleepStore.getState().updateDraft("B2", { notes: "rascunho B2" });
    const st = useSleepStore.getState();
    expect(st.timers.B1.notes).toBe("acordou");
    expect(st.timers.B2).toBeUndefined();
    expect(st.draft.notes).toBe("rascunho B2");
  });

  it("sync_resets_drafts", () => {
    const s = useSleepStore.getState();
    s.startTimer("B1", "OLD", "2026-11-15T09:00:00.000Z", "NAP");
    useSleepStore.getState().updateDraft("B1", { notes: "local", roomTemp: 25, sleepSackTog: 2.5 });
    useSleepStore.getState().updateDraft("B2", { notes: "pre-start", weatherCondition: "sun" });
    useSleepStore.getState().restoreFromSession("B1", "S9", "2026-11-15T10:00:00.000Z", "NIGHT_SLEEP");
    const st = useSleepStore.getState();
    expect(st.timers.B1).toEqual({
      ...EMPTY_SLEEP_DRAFT,
      sessionId: "S9",
      startTime: "2026-11-15T10:00:00.000Z",
      sleepType: "NIGHT_SLEEP",
    });
    expect(st.draft).toEqual(EMPTY_SLEEP_DRAFT);
  });

  it("restoreFromSession for one baby leaves other babies' timers alone", () => {
    useSleepStore.getState().startTimer("B1", "S1", "2026-11-15T10:00:00.000Z", "NAP");
    useSleepStore.getState().restoreFromSession("B2", "S2", "2026-11-15T11:00:00.000Z", "NAP");
    expect(Object.keys(useSleepStore.getState().timers).sort()).toEqual(["B1", "B2"]);
  });

  it("changing the selected baby does not touch the timers", () => {
    useSleepStore.getState().startTimer("B1", "S1", "2026-11-15T10:00:00.000Z", "NAP");
    useSleepStore.getState().setActiveBabyId("B2");
    expect(useSleepStore.getState().timers.B1?.sessionId).toBe("S1");
  });
});
