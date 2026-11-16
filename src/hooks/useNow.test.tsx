// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { useNow } from "./useNow";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T12:00:00.400Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function Probe({ onValue }: { onValue: (v: number | null) => void }) {
  onValue(useNow());
  return null;
}

describe("useNow", () => {
  it("useNow_server_snapshot_is_stable", () => {
    let seen: number | null | undefined;
    renderToString(<Probe onValue={(v) => (seen = v)} />);
    expect(seen).toBeNull();
  });

  it("useNow_ticks_every_second", () => {
    const { result } = renderHook(() => useNow());
    const values = [result.current];
    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      values.push(result.current);
    }
    expect(values[0]).toBe(Date.parse("2026-01-01T12:00:00.000Z"));
    expect(new Set(values).size).toBe(4);
    expect(values[3]).toBe(values[0]! + 3000);
  });

  it("useNow_single_interval_for_many_consumers", () => {
    const spy = vi.spyOn(globalThis, "setInterval");
    render(
      <>
        <Probe onValue={() => {}} />
        <Probe onValue={() => {}} />
      </>
    );
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("badge_and_timer_share_clock", () => {
    const a: (number | null)[] = [];
    const b: (number | null)[] = [];
    render(
      <>
        <Probe onValue={(v) => a.push(v)} />
        <Probe onValue={(v) => b.push(v)} />
      </>
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(a.at(-1)).not.toBeNull();
    expect(a.at(-1)).toBe(b.at(-1));
  });

  it("stops_interval_when_unmounted", () => {
    const clear = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = render(<Probe onValue={() => {}} />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(clear).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("disabled_does_not_subscribe", () => {
    const { result, rerender } = renderHook(({ on }) => useNow(1000, on), {
      initialProps: { on: false },
    });
    expect(result.current).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    rerender({ on: true });
    expect(result.current).toBe(Date.parse("2026-01-01T12:00:00.000Z"));
    expect(vi.getTimerCount()).toBe(1);
    rerender({ on: false });
    expect(result.current).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
