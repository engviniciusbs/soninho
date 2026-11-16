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

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useWakeWindow", () => {
  it("now_advances_without_completed_session", async () => {
    const { result } = renderHook(() => useWakeWindow(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const before = result.current.now;
    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(result.current.now).toBeGreaterThanOrEqual(before + 2 * 60_000);
  });

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
});
