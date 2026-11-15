import { beforeEach, describe, expect, it, vi } from "vitest";

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

const { useFeedingStore, migrateFeedingState } = await import("./feedingStore");

/** Exactly the keys version 0 of "soninho-feeding-timer" persisted. */
function v0State(overrides: Record<string, unknown> = {}) {
  return {
    isRunning: true,
    sessionId: "F1",
    startTime: "2026-11-15T10:00:00.000Z",
    activeBabyId: "B1",
    activeSide: "RIGHT",
    sideLeftSec: 300,
    sideRightSec: 40,
    sideStartedAt: "2026-11-15T10:05:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  memory.clear();
  useFeedingStore.setState({ timers: {} });
});

describe("migrateFeedingState", () => {
  it("migrates_v0_running_timer", () => {
    expect(migrateFeedingState(v0State(), 0)).toEqual({
      timers: {
        B1: {
          sessionId: "F1",
          startTime: "2026-11-15T10:00:00.000Z",
          activeSide: "RIGHT",
          sideLeftSec: 300,
          sideRightSec: 40,
          sideStartedAt: "2026-11-15T10:05:00.000Z",
        },
      },
    });
  });

  it("migrates_v0_without_baby_drops_timer", () => {
    expect(migrateFeedingState(v0State({ activeBabyId: null }), 0)).toEqual({ timers: {} });
  });

  it("drops a stopped or incomplete v0 timer and tolerates garbage", () => {
    expect(migrateFeedingState(v0State({ isRunning: false }), 0)).toEqual({ timers: {} });
    expect(migrateFeedingState(v0State({ sessionId: null }), 0)).toEqual({ timers: {} });
    for (const junk of [null, undefined, 1, "x"]) {
      expect(migrateFeedingState(junk, 0)).toEqual({ timers: {} });
    }
  });

  it("sanitizes v0 side fields", () => {
    const t = migrateFeedingState(
      v0State({ activeSide: "MIDDLE", sideLeftSec: "a", sideRightSec: -5, sideStartedAt: 3 }),
      0
    ).timers.B1;
    expect(t).toMatchObject({ activeSide: "LEFT", sideLeftSec: 0, sideRightSec: 0, sideStartedAt: null });
  });

  it("rehydrates a v0 localStorage entry through persist", async () => {
    memory.set("soninho-feeding-timer", JSON.stringify({ state: v0State(), version: 0 }));
    await useFeedingStore.persist.rehydrate();
    expect(useFeedingStore.getState().timers.B1?.sessionId).toBe("F1");
    expect(JSON.parse(memory.get("soninho-feeding-timer")!).version).toBe(1);
  });
});

describe("breastfeeding timer actions", () => {
  it("timers_are_independent_per_baby", () => {
    const s = useFeedingStore.getState();
    s.startBreastTimer("B1", "F1", "2026-11-15T10:00:00.000Z", "LEFT");
    s.startBreastTimer("B2", "F2", "2026-11-15T11:00:00.000Z", "RIGHT");
    useFeedingStore.getState().switchSide("B2", "LEFT", 120);
    useFeedingStore.getState().stopBreastTimer("B2");
    const { timers } = useFeedingStore.getState();
    expect(timers.B2).toBeUndefined();
    expect(timers.B1).toEqual({
      sessionId: "F1",
      startTime: "2026-11-15T10:00:00.000Z",
      activeSide: "LEFT",
      sideLeftSec: 0,
      sideRightSec: 0,
      sideStartedAt: "2026-11-15T10:00:00.000Z",
    });
  });

  it("switchSide stores the accumulated seconds of the side being left", () => {
    useFeedingStore.getState().startBreastTimer("B1", "F1", "2026-11-15T10:00:00.000Z", "LEFT");
    useFeedingStore.getState().switchSide("B1", "RIGHT", 95);
    expect(useFeedingStore.getState().timers.B1).toMatchObject({
      activeSide: "RIGHT",
      sideLeftSec: 95,
      sideRightSec: 0,
    });
  });

  it("switchSide without a timer for that baby is a no-op", () => {
    useFeedingStore.getState().switchSide("B9", "RIGHT", 10);
    expect(useFeedingStore.getState().timers).toEqual({});
  });

  it("sync_resets_drafts: restoreBreastSession sets the baby and replaces local counters", () => {
    useFeedingStore.getState().startBreastTimer("B1", "OLD", "2026-11-15T09:00:00.000Z", "LEFT");
    useFeedingStore.getState().restoreBreastSession("B1", "F9", "2026-11-15T10:00:00.000Z", "RIGHT", 60, 30);
    const t = useFeedingStore.getState().timers.B1;
    expect(t).toMatchObject({
      sessionId: "F9",
      startTime: "2026-11-15T10:00:00.000Z",
      activeSide: "RIGHT",
      sideLeftSec: 60,
      sideRightSec: 30,
    });
    expect(typeof t.sideStartedAt).toBe("string");
  });
});
