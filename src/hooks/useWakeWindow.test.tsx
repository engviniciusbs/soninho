// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWakeWindow } from "./useWakeWindow";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/supabase/queries/sleep", () => ({
  getLastSleepSession: vi.fn(async () => ({ data: null })),
}));
vi.mock("@/components/providers/BabyProvider", () => ({
  useBaby: () => ({
    activeBaby: { id: "b1", birth_date: "2026-01-01" },
  }),
}));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useWakeWindow", () => {
  it("elapsed_advances_with_completed_session", async () => {
    const queries = await import("@/lib/supabase/queries/sleep");
    const end = new Date(Date.now() - 10 * 60_000).toISOString();
    vi.mocked(queries.getLastSleepSession).mockResolvedValueOnce({
      data: { end_time: end },
    } as never);
    const { result } = renderHook(() => useWakeWindow(), { wrapper });
    await waitFor(() => expect(result.current.lastSleepEnd).toBe(end));
    const before = result.current.elapsedMinutes;
    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(result.current.elapsedMinutes - before).toBeCloseTo(2, 0);
  });

  it("elapsed_reflects_a_fresh_last_sleep_end_without_advancing_timers", async () => {
    const queries = await import("@/lib/supabase/queries/sleep");
    const old = new Date(Date.now() - 60 * 60_000).toISOString();
    // Sleep ended after the last 60s tick: must read as just-ended, never negative.
    const fresh = new Date(Date.now() + 20_000).toISOString();
    vi.mocked(queries.getLastSleepSession)
      .mockResolvedValueOnce({ data: { end_time: old } } as never)
      .mockResolvedValue({ data: { end_time: fresh } } as never);
    const { result } = renderHook(() => useWakeWindow(), { wrapper });
    await waitFor(() => expect(result.current.lastSleepEnd).toBe(old));
    expect(result.current.elapsedMinutes).toBeCloseTo(60, 0);
    void client.refetchQueries({ queryKey: ["last-session"] });
    await waitFor(() => expect(result.current.lastSleepEnd).toBe(fresh));
    expect(result.current.elapsedMinutes).toBe(0);
  });
});
