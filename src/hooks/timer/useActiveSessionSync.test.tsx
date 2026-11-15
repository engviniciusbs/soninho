// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup } from "@testing-library/react";
import { renderHookWithProviders } from "@/test/render";
import type { LiveSessionResult } from "@/lib/supabase/sessionConflict";
import { useActiveSessionSync } from "./useActiveSessionSync";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const running: LiveSessionResult = { data: { baby_id: "b1", end_time: null }, error: null };
const ended: LiveSessionResult = { data: { baby_id: "b1", end_time: "x" }, error: null };
const otherBaby: LiveSessionResult = { data: { baby_id: "b2", end_time: null }, error: null };
const failed: LiveSessionResult = { data: null, error: new Error("offline") };

function setup(responses: LiveSessionResult[], sessionId: string | null = "s1") {
  const fetchStatus = vi.fn(async () => responses.shift() ?? running);
  const onEnded = vi.fn();
  const onMismatch = vi.fn();
  const hook = renderHookWithProviders(
    (props: { sessionId: string | null }) =>
      useActiveSessionSync({
        queryKey: "test-live",
        babyId: "b1",
        sessionId: props.sessionId,
        fetchStatus,
        // New callback identities on every render must not re-fire them.
        onEnded: () => onEnded(),
        onMismatch: () => onMismatch(),
      }),
    { initialProps: { sessionId } }
  );
  return { ...hook, fetchStatus, onEnded, onMismatch };
}

describe("useActiveSessionSync", () => {
  it("session_sync_polls_every_20s", async () => {
    const { fetchStatus } = setup([]);
    await flush();
    expect(fetchStatus).toHaveBeenCalledTimes(1);
    expect(fetchStatus).toHaveBeenCalledWith("s1");
    await flush(20_000);
    expect(fetchStatus).toHaveBeenCalledTimes(2);
  });

  it("session_sync_ended_calls_onEnded_once", async () => {
    const { onEnded, onMismatch, rerender } = setup([running, ended]);
    await flush();
    expect(onEnded).not.toHaveBeenCalled();
    await flush(20_000);
    await flush(1000); // react-query delivers the refetch on a later timer
    expect(onEnded).toHaveBeenCalledTimes(1);
    rerender({ sessionId: "s1" });
    await flush();
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(onMismatch).not.toHaveBeenCalled();
  });

  it("session_sync_mismatch_calls_onMismatch", async () => {
    const { onEnded, onMismatch } = setup([otherBaby]);
    await flush();
    expect(onMismatch).toHaveBeenCalledTimes(1);
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("session_sync_error_is_ignored", async () => {
    const { onEnded, onMismatch } = setup([failed, failed, failed]);
    await flush(40_000);
    expect(onEnded).not.toHaveBeenCalled();
    expect(onMismatch).not.toHaveBeenCalled();
  });

  it("session_sync_idle_without_session", async () => {
    const { fetchStatus } = setup([], null);
    await flush(40_000);
    expect(fetchStatus).not.toHaveBeenCalled();
  });
});
