// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup } from "@testing-library/react";
import { toast } from "sonner";
import { focusManager } from "@tanstack/react-query";
import { renderHookWithProviders } from "@/test/render";
import { createFakeSupabase, type FakeSupabase } from "@/test/fakeSupabase";
import { EMPTY_SLEEP_DRAFT, useSleepStore } from "@/store/sleepStore";
import type { Baby } from "@/types";
import { useSleepTimer } from "./useSleepTimer";

const holder = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => holder.client }));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const TABLE = "sleep_sessions";
const baby = { id: "baby-1", name: "Lia" } as Baby;
let fake: FakeSupabase;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
  fake = createFakeSupabase();
  holder.client = fake.client;
  fetchMock = vi.fn(async () => new Response(null));
  vi.stubGlobal("fetch", fetchMock);
  useSleepStore.setState({ timers: {}, draft: { ...EMPTY_SLEEP_DRAFT } });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function mountRunning() {
  const hook = renderHookWithProviders(() => useSleepTimer(), {
    baby: { activeBaby: baby, babies: [baby] },
  });
  await flush();
  await act(() => hook.result.current.handleStart());
  await flush();
  return hook;
}

function activityCalls(action: string) {
  return fetchMock.mock.calls.filter(
    ([url, init]) =>
      url === "/api/family/sleep-activity" &&
      JSON.parse((init as RequestInit).body as string).action === action
  );
}

describe("useSleepTimer (characterization)", () => {
  it("start_creates_session_and_timer", async () => {
    const { result } = await mountRunning();

    const rows = fake.rows(TABLE);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ baby_id: baby.id, type: "NAP", end_time: null });
    expect(useSleepStore.getState().timers[baby.id]?.sessionId).toBe(rows[0].id);
    expect(result.current.isRunning).toBe(true);
    expect(toast.success).toHaveBeenCalledWith("Soneca iniciada");
    expect(activityCalls("started")).toHaveLength(1);

    await flush(5000);
    expect(result.current.elapsed).toBe("00:00:05");
  });

  it("stop_ends_session_once", async () => {
    const { result } = await mountRunning();
    const sessionId = fake.rows(TABLE)[0].id;
    await flush(3000);

    let outcomes: unknown[] = [];
    await act(async () => {
      outcomes = await Promise.all([result.current.handleStop(), result.current.handleStop()]);
    });

    expect(outcomes).toContainEqual({ endedSessionId: sessionId, sleepType: "NAP" });
    expect(outcomes).toContainEqual(null);
    expect(fake.rows(TABLE)[0].end_time).toEqual(expect.any(String));
    expect(activityCalls("stopped")).toHaveLength(1);
    expect(
      vi.mocked(toast.success).mock.calls.filter(([m]) => m === "Sono registrado com sucesso")
    ).toHaveLength(1);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.elapsed).toBe("00:00:00");
  });

  it("conflict_syncs_existing", async () => {
    const { result } = renderHookWithProviders(() => useSleepTimer(), {
      baby: { activeBaby: baby, babies: [baby] },
    });
    await flush();
    // Another caregiver opens a session after this phone's mount restore.
    fake.seed(TABLE, {
      id: "other-caregiver",
      baby_id: baby.id,
      type: "NIGHT_SLEEP",
      start_time: "2026-01-01T11:00:00.000Z",
    });
    await act(() => result.current.handleStart());
    await flush();

    expect(fake.rows(TABLE)).toHaveLength(1);
    expect(useSleepStore.getState().timers[baby.id]).toMatchObject({
      sessionId: "other-caregiver",
      sleepType: "NIGHT_SLEEP",
    });
    expect(result.current.isRunning).toBe(true);
    expect(result.current.sleepType).toBe("NIGHT_SLEEP");
    expect(activityCalls("started")).toHaveLength(0);
    expect(toast.success).toHaveBeenCalledWith("Já existe um sono em andamento, sincronizado");
  });

  it("poll_error_keeps_timer", async () => {
    const { result } = await mountRunning();
    fake.setError(TABLE, "select", { message: "Failed to fetch" });

    await flush(60_000);

    expect(result.current.isRunning).toBe(true);
    expect(toast.info).not.toHaveBeenCalled();
    expect(result.current.elapsed).toBe("00:01:00");
  });

  it("poll_ended_stops_timer", async () => {
    const { result } = await mountRunning();
    fake.rows(TABLE)[0].end_time = "2026-01-01T12:00:10.000Z";

    await flush(20_000);

    expect(result.current.isRunning).toBe(false);
    expect(useSleepStore.getState().timers[baby.id]).toBeUndefined();
    expect(toast.info).toHaveBeenCalledWith("Sono finalizado por outro cuidador(a)");
  });

  describe("adopting a sleep started on another phone (spec #14)", () => {
    afterEach(() => {
      focusManager.setFocused(undefined);
    });

    function seedOtherCaregiver() {
      fake.seed(TABLE, {
        id: "other-caregiver",
        baby_id: baby.id,
        type: "NIGHT_SLEEP",
        start_time: "2026-01-01T11:55:00.000Z",
      });
    }

    it("without a local timer, the 30 s poll adopts the open session", async () => {
      const { result } = renderHookWithProviders(() => useSleepTimer(), {
        baby: { activeBaby: baby, babies: [baby] },
      });
      await flush();
      expect(result.current.isRunning).toBe(false);

      seedOtherCaregiver();
      await flush(29_000);
      expect(result.current.isRunning).toBe(false);
      await flush(1_000);

      expect(result.current.isRunning).toBe(true);
      expect(result.current.sleepType).toBe("NIGHT_SLEEP");
      expect(useSleepStore.getState().timers[baby.id]?.sessionId).toBe("other-caregiver");
      // Adopting only reads: nothing is written.
      expect(fake.rows(TABLE)).toHaveLength(1);
      expect(activityCalls("started")).toHaveLength(0);
    });

    it("does not poll while the page is hidden, and catches up when it shows", async () => {
      const { result } = renderHookWithProviders(() => useSleepTimer(), {
        baby: { activeBaby: baby, babies: [baby] },
      });
      await flush();
      act(() => focusManager.setFocused(false));

      seedOtherCaregiver();
      await flush(90_000);
      expect(result.current.isRunning).toBe(false);

      act(() => focusManager.setFocused(true));
      await flush();
      expect(result.current.isRunning).toBe(true);
    });

    it("a session ended by someone else is not adopted again", async () => {
      const { result } = await mountRunning();
      fake.rows(TABLE)[0].end_time = "2026-01-01T12:00:10.000Z";

      await flush(20_000);
      expect(result.current.isRunning).toBe(false);
      await flush(60_000);

      expect(result.current.isRunning).toBe(false);
      expect(toast.info).toHaveBeenCalledTimes(1);
    });
  });
});
