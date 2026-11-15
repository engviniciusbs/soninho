// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { EMPTY_SLEEP_DRAFT, useSleepStore } from "@/store/sleepStore";
import type { Baby } from "@/types";
import { WakeWindowBadge } from "./WakeWindowBadge";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/supabase/queries", () => ({
  getLastSleepSession: vi.fn(async () => ({ data: null, error: null })),
  getRecentSessions: vi.fn(async () => ({ data: [], error: null })),
}));

const NOW = new Date("2026-01-01T12:00:00.000Z");
const baby = { id: "baby-1", name: "Lia", birth_date: "2025-11-01" } as Baby;
let setIntervalSpy: { mock: { calls: unknown[][] } };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  setIntervalSpy = vi.spyOn(globalThis, "setInterval");
  useSleepStore.setState({ timers: {}, draft: { ...EMPTY_SLEEP_DRAFT } });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function mount() {
  renderWithProviders(<WakeWindowBadge />, { baby: { activeBaby: baby, babies: [baby] } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

const secondTicks = () => setIntervalSpy.mock.calls.filter(([, ms]) => ms === 1000);

describe("WakeWindowBadge", () => {
  it("does_not_subscribe_to_1s_clock_when_awake", async () => {
    await mount();

    expect(screen.getByText("Tempo acordado")).toBeInTheDocument();
    expect(secondTicks()).toHaveLength(0);
  });

  it("shows_ticking_elapsed_while_sleeping", async () => {
    const startTime = new Date(NOW.getTime() - 754_000).toISOString();
    useSleepStore.setState({
      timers: { [baby.id]: { ...EMPTY_SLEEP_DRAFT, sessionId: "s-1", startTime } },
    });
    await mount();

    expect(screen.getByText("Dormindo")).toBeInTheDocument();
    expect(screen.getByText("Soneca")).toBeInTheDocument();
    expect(screen.getByText("00:12:34")).toBeInTheDocument();
    expect(secondTicks()).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByText("00:12:35")).toBeInTheDocument();
  });
});
