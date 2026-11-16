// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useNow } from "@/hooks/useNow";
import { useSessionClock } from "./useSessionClock";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T12:00:10.000Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useSessionClock", () => {
  it("session_clock_counts_whole_seconds_since_start", () => {
    const { result } = renderHook(() => useSessionClock("2026-01-01T12:00:00.000Z"));
    expect(result.current.elapsedSec).toBe(10);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.elapsedSec).toBe(13);
  });

  it("session_clock_null_without_start_and_idle", () => {
    const spy = vi.spyOn(globalThis, "setInterval");
    const { result } = renderHook(() => useSessionClock(null));
    expect(result.current.elapsedSec).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("session_clock_never_negative", () => {
    const { result } = renderHook(() => useSessionClock("2026-01-01T12:05:00.000Z"));
    expect(result.current.elapsedSec).toBe(0);
  });

  it("session_clock_shares_tick_with_useNow", () => {
    const start = "2026-01-01T12:00:00.000Z";
    const { result } = renderHook(() => ({ clock: useSessionClock(start), now: useNow() }));
    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.clock.elapsedSec).toBe((result.current.now! - Date.parse(start)) / 1000);
    }
  });
});
