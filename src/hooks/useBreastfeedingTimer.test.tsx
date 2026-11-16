// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup } from "@testing-library/react";
import { toast } from "sonner";
import { renderHookWithProviders } from "@/test/render";
import { createFakeSupabase, type FakeSupabase } from "@/test/fakeSupabase";
import { useFeedingStore } from "@/store/feedingStore";
import type { Baby } from "@/types";
import { useBreastfeedingTimer } from "./useBreastfeedingTimer";

const holder = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => holder.client }));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const TABLE = "breastfeeding_sessions";
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
  useFeedingStore.setState({ timers: {} });
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

function mount() {
  return renderHookWithProviders(() => useBreastfeedingTimer(), {
    baby: { activeBaby: baby, babies: [baby] },
  });
}

async function mountRunning() {
  const hook = mount();
  await flush();
  await act(() => hook.result.current.handleStart());
  await flush();
  return hook;
}

function activityCalls(action: string) {
  return fetchMock.mock.calls.filter(
    ([url, init]) =>
      url === "/api/family/feeding-activity" &&
      JSON.parse((init as RequestInit).body as string).action === action
  );
}

describe("useBreastfeedingTimer (characterization)", () => {
  it("start_creates_session_and_timer", async () => {
    const { result } = await mountRunning();

    const rows = fake.rows(TABLE);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ baby_id: baby.id, last_side: "LEFT", end_time: null });
    expect(useFeedingStore.getState().timers[baby.id]?.sessionId).toBe(rows[0].id);
    expect(result.current.isRunning).toBe(true);
    expect(result.current.startTime).toBe(rows[0].start_time);
    expect(result.current.activeSide).toBe("LEFT");
    expect(toast.success).toHaveBeenCalledWith("Mamada iniciada");
    expect(activityCalls("started")).toHaveLength(1);

    await flush(5000);
    expect(result.current.liveLeftSec).toBe(5);
    expect(result.current.liveRightSec).toBe(0);

    // Switching side freezes the left total and starts counting the right one.
    await act(() => result.current.handleSwitchSide("RIGHT"));
    await flush(3000);
    expect(result.current.activeSide).toBe("RIGHT");
    expect(result.current.liveLeftSec).toBe(5);
    expect(result.current.liveRightSec).toBe(3);
    expect(fake.rows(TABLE)[0]).toMatchObject({ side_left_sec: 5, last_side: "RIGHT" });
  });

  it("stop_ends_session_once", async () => {
    const { result } = await mountRunning();
    const sessionId = fake.rows(TABLE)[0].id;
    await flush(4000);

    let outcomes: unknown[] = [];
    await act(async () => {
      outcomes = await Promise.all([result.current.handleStop(), result.current.handleStop()]);
    });

    expect(outcomes).toContainEqual({ endedSessionId: sessionId });
    expect(outcomes).toContainEqual(null);
    expect(fake.rows(TABLE)[0]).toMatchObject({
      end_time: expect.any(String),
      side_left_sec: 4,
      side_right_sec: 0,
    });
    expect(activityCalls("stopped")).toHaveLength(1);
    expect(
      vi.mocked(toast.success).mock.calls.filter(([m]) => m === "Mamada registrada com sucesso")
    ).toHaveLength(1);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.liveLeftSec).toBe(0);
  });

  it("conflict_syncs_existing", async () => {
    const { result } = mount();
    await flush();
    // Another caregiver opens a session after this phone's mount restore.
    fake.seed(TABLE, {
      id: "other-caregiver",
      baby_id: baby.id,
      start_time: "2026-01-01T11:50:00.000Z",
      last_side: "RIGHT",
      side_left_sec: 30,
      side_right_sec: 12,
    });
    await act(() => result.current.handleStart("LEFT"));
    await flush();

    expect(fake.rows(TABLE)).toHaveLength(1);
    expect(useFeedingStore.getState().timers[baby.id]).toMatchObject({
      sessionId: "other-caregiver",
      activeSide: "RIGHT",
      sideLeftSec: 30,
      sideRightSec: 12,
    });
    expect(result.current.isRunning).toBe(true);
    expect(result.current.activeSide).toBe("RIGHT");
    expect(result.current.liveLeftSec).toBe(30);
    expect(result.current.liveRightSec).toBe(12);
    expect(toast.success).toHaveBeenCalledWith("Já existe uma mamada em andamento, sincronizada");
    expect(activityCalls("started")).toHaveLength(0);

    await flush(2000);
    expect(result.current.liveRightSec).toBe(14);
  });

  it("poll_error_keeps_timer", async () => {
    const { result } = await mountRunning();
    fake.setError(TABLE, "select", { message: "Failed to fetch" });

    await flush(60_000);

    expect(result.current.isRunning).toBe(true);
    expect(toast.info).not.toHaveBeenCalled();
    expect(result.current.liveLeftSec).toBe(60);
  });

  it("poll_ended_stops_timer", async () => {
    const { result } = await mountRunning();
    fake.rows(TABLE)[0].end_time = "2026-01-01T12:00:10.000Z";

    await flush(20_000);

    expect(result.current.isRunning).toBe(false);
    expect(useFeedingStore.getState().timers[baby.id]).toBeUndefined();
    expect(toast.info).toHaveBeenCalledWith("Mamada finalizada por outro cuidador(a)");
  });
});
