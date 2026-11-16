// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@/test/render";
import type { Baby, SleepSession } from "@/types";
import { useAnalyticsData } from "@/components/analytics/useAnalyticsData";

const holder = vi.hoisted(() => ({ sessions: [] as unknown[] }));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/supabase/queries/sleep", () => ({
  getRecentSessions: vi.fn(async () => ({ data: holder.sessions, error: null })),
}));

const baby = { id: "baby-1", name: "Lia", birth_date: "2026-06-01" } as Baby;
const NOW = new Date("2026-11-16T12:00:00.000Z"); // 09:00 local

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useAnalyticsData", () => {
  it("sono_24h_keeps_counting_a_running_sleep_as_the_clock_moves", async () => {
    holder.sessions = [
      {
        id: "s-1",
        baby_id: baby.id,
        type: "NAP",
        start_time: new Date(NOW.getTime() - 30 * 60_000).toISOString(),
        end_time: null,
        duration_min: null,
      } as SleepSession,
    ];
    const { result } = renderHookWithProviders(() => useAnalyticsData(7), {
      baby: { activeBaby: baby, babies: [baby] },
    });
    await waitFor(() => expect(result.current.last24h.totalMinutes).toBe(30));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60_000);
    });
    expect(result.current.last24h.totalMinutes).toBe(35);
  });

  it("the period window moves with the clock too", async () => {
    // Started 7 days minus 1 minute ago: inside the 7-day window, for 1 more minute.
    holder.sessions = [
      {
        id: "s-old",
        baby_id: baby.id,
        type: "NAP",
        start_time: new Date(NOW.getTime() - 7 * 24 * 60 * 60_000 + 60_000).toISOString(),
        end_time: new Date(NOW.getTime() - 7 * 24 * 60 * 60_000 + 30 * 60_000).toISOString(),
        duration_min: 29,
      } as SleepSession,
    ];
    const { result } = renderHookWithProviders(() => useAnalyticsData(7), {
      baby: { activeBaby: baby, babies: [baby] },
    });
    await waitFor(() => expect(result.current.periodSessions).toHaveLength(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60_000);
    });
    expect(result.current.periodSessions).toHaveLength(0);
  });
});
