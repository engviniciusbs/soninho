// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup } from "@testing-library/react";
import { toast } from "sonner";
import { renderHookWithProviders } from "@/test/render";
import { createFakeSupabase, type FakeSupabase } from "@/test/fakeSupabase";
import { useFeedingStore } from "@/store/feedingStore";
import type { Baby } from "@/types";
import { updateBreastfeedingSides } from "@/lib/supabase/feedingQueries";
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
      // The right side was (re)started just now, so 12 s is its whole total.
      side_started_at: "2026-01-01T12:00:00.000Z",
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

describe("useBreastfeedingTimer: two phones (side_started_at)", () => {
  it("phone B restores mid-side and stops with the right totals", async () => {
    // Phone A: starts on the left at 10:00 and switches to the right at 10:12.
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    const a = await mountRunning();
    const id = fake.rows(TABLE)[0].id;
    expect(fake.rows(TABLE)[0].side_started_at).toBe("2026-01-01T10:00:00.000Z");
    await flush(12 * 60_000);
    await act(() => a.result.current.handleSwitchSide("RIGHT"));
    expect(fake.rows(TABLE)[0]).toMatchObject({
      side_left_sec: 720,
      side_right_sec: 0,
      last_side: "RIGHT",
      side_started_at: "2026-01-01T10:12:00.000Z",
    });
    a.unmount();

    // Phone B: no local timer, opens the app at 10:15.
    useFeedingStore.setState({ timers: {} });
    await act(async () => {
      vi.setSystemTime(new Date("2026-01-01T10:15:00.000Z"));
    });
    const b = mount();
    await flush();
    expect(b.result.current.isRunning).toBe(true);
    expect(b.result.current.activeSide).toBe("RIGHT");
    expect(b.result.current.liveLeftSec).toBe(720);
    expect(b.result.current.liveRightSec).toBe(180);

    await flush(5 * 60_000);
    let out: unknown;
    await act(async () => {
      out = await b.result.current.handleStop();
    });
    expect(out).toEqual({ endedSessionId: id });
    expect(fake.rows(TABLE)[0]).toMatchObject({
      end_time: expect.any(String),
      side_left_sec: 720,
      side_right_sec: 480,
    });
  });

  it("updating the sides after another phone ended the session changes nothing", async () => {
    fake.seed(TABLE, {
      id: "ended",
      baby_id: baby.id,
      start_time: "2026-01-01T11:00:00.000Z",
      end_time: "2026-01-01T11:20:00.000Z",
      last_side: "LEFT",
      side_left_sec: 1200,
      side_right_sec: 0,
      side_started_at: "2026-01-01T11:00:00.000Z",
    });
    const res = await updateBreastfeedingSides(fake.client as never, "ended", {
      side_left_sec: 5,
      side_right_sec: 7,
      last_side: "RIGHT",
      side_started_at: "2026-01-01T12:00:00.000Z",
    });
    expect(res).toEqual({ error: null, updated: false });
    expect(fake.rows(TABLE)[0]).toMatchObject({
      side_left_sec: 1200,
      side_right_sec: 0,
      last_side: "LEFT",
      side_started_at: "2026-01-01T11:00:00.000Z",
    });
  });

  it("switching after another phone ended the session drops the local timer", async () => {
    const { result } = await mountRunning();
    const row = fake.rows(TABLE)[0];
    await flush(3000);
    // Ended elsewhere with its own totals, before this phone's poll noticed.
    Object.assign(row, { end_time: "2026-01-01T12:00:02.000Z", side_left_sec: 2 });

    await act(() => result.current.handleSwitchSide("RIGHT"));

    expect(fake.rows(TABLE)[0]).toMatchObject({ side_left_sec: 2, last_side: "LEFT" });
    expect(result.current.isRunning).toBe(false);
    expect(toast.info).toHaveBeenCalledWith("Mamada finalizada por outro cuidador(a)");
  });

  it("a failed side update keeps the previous side and warns", async () => {
    const { result } = await mountRunning();
    await flush(3000);
    fake.setError(TABLE, "update", { message: "Failed to fetch" });

    await act(() => result.current.handleSwitchSide("RIGHT"));

    expect(toast.error).toHaveBeenCalledWith("Erro ao trocar o lado. Tente novamente.");
    expect(result.current.isRunning).toBe(true);
    expect(result.current.activeSide).toBe("LEFT");
    expect(result.current.liveLeftSec).toBe(3);
    expect(fake.rows(TABLE)[0]).toMatchObject({ last_side: "LEFT", side_left_sec: 0 });
  });

  it("an open row from before the deploy (no side_started_at) restores from updated_at", async () => {
    // Old app: started 11:40 on the left, switched to the right at 11:45.
    fake.seed(TABLE, {
      id: "old-open",
      baby_id: baby.id,
      start_time: "2026-01-01T11:40:00.000Z",
      updated_at: "2026-01-01T11:45:00.000Z",
      last_side: "RIGHT",
      side_left_sec: 300,
      side_right_sec: 0,
    });
    const { result } = mount();
    await flush();
    expect(result.current.liveLeftSec).toBe(300);
    expect(result.current.liveRightSec).toBe(900);

    await flush(60_000);
    await act(async () => {
      await result.current.handleStop();
    });
    expect(fake.rows(TABLE)[0]).toMatchObject({ side_left_sec: 300, side_right_sec: 960 });
  });

  it("an open row without side_started_at nor updated_at counts from start_time", async () => {
    fake.seed(TABLE, {
      id: "old-open",
      baby_id: baby.id,
      start_time: "2026-01-01T11:50:00.000Z",
      last_side: "LEFT",
    });
    const { result } = mount();
    await flush();
    expect(result.current.liveLeftSec).toBe(600);
    await act(async () => {
      await result.current.handleStop();
    });
    expect(fake.rows(TABLE)[0]).toMatchObject({ side_left_sec: 600, side_right_sec: 0 });
  });

  it("a timer persisted by the old app (restored at open time) stops with the DB totals", async () => {
    // Old app on this phone restored the session at 11:58 and counted from there.
    fake.seed(TABLE, {
      id: "old-open",
      baby_id: baby.id,
      start_time: "2026-01-01T11:30:00.000Z",
      updated_at: "2026-01-01T11:30:00.000Z",
      last_side: "LEFT",
    });
    useFeedingStore.setState({
      timers: {
        [baby.id]: {
          sessionId: "old-open",
          startTime: "2026-01-01T11:30:00.000Z",
          activeSide: "LEFT",
          sideLeftSec: 0,
          sideRightSec: 0,
          sideStartedAt: "2026-01-01T11:58:00.000Z",
        },
      },
    });
    const { result } = mount();
    await flush();
    expect(result.current.liveLeftSec).toBe(1800);
    await act(async () => {
      await result.current.handleStop();
    });
    expect(fake.rows(TABLE)[0]).toMatchObject({ side_left_sec: 1800, side_right_sec: 0 });
  });

  it("a persisted timer without sideStartedAt stops with the DB totals", async () => {
    fake.seed(TABLE, {
      id: "old-open",
      baby_id: baby.id,
      start_time: "2026-01-01T11:50:00.000Z",
      last_side: "LEFT",
    });
    useFeedingStore.setState({
      timers: {
        [baby.id]: {
          sessionId: "old-open",
          startTime: "2026-01-01T11:50:00.000Z",
          activeSide: "LEFT",
          sideLeftSec: 0,
          sideRightSec: 0,
          sideStartedAt: null,
        },
      },
    });
    const { result } = mount();
    await flush();
    await act(async () => {
      await result.current.handleStop();
    });
    expect(fake.rows(TABLE)[0]).toMatchObject({ side_left_sec: 600, side_right_sec: 0 });
  });
});
