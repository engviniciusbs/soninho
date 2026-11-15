// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { format } from "date-fns";
import { renderWithProviders } from "@/test/render";
import { createFakeSupabase, type FakeSupabase } from "@/test/fakeSupabase";
import { BabyContext, type BabyContextValue } from "@/components/providers/BabyProvider";
import { EMPTY_SLEEP_DRAFT, useSleepStore } from "@/store/sleepStore";
import { getMinutesUntilNextNap, getWakeWindowRange } from "@/lib/sleep/wakeWindows";
import type { AISuggestion, Baby } from "@/types";
import { SleepTimer } from "../SleepTimer";

const holder = vi.hoisted(() => ({
  client: null as unknown,
  ai: undefined as unknown,
  lastSession: null as unknown,
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => holder.client }));
vi.mock("@/lib/supabase/queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase/queries")>()),
  // The fake client models the live-timer queries only; the ring's read-only
  // queries are stubbed here.
  getLastSleepSession: vi.fn(async () => ({ data: holder.lastSession, error: null })),
  getRecentSessions: vi.fn(async () => ({ data: [], error: null })),
}));
vi.mock("@/hooks/useAISuggestions", () => ({
  useAISuggestions: () => ({ data: holder.ai }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const TABLE = "sleep_sessions";
const NOW = new Date("2026-01-01T12:00:00.000Z"); // 09:00 in America/Sao_Paulo
const baby = { id: "baby-1", name: "Lia", birth_date: "2025-11-01" } as Baby;
let fake: FakeSupabase;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  fake = createFakeSupabase();
  holder.client = fake.client;
  holder.ai = undefined;
  holder.lastSession = {
    id: "prev",
    end_time: new Date(NOW.getTime() - 30 * 60_000).toISOString(),
  };
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null)));
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

async function mount() {
  const view = renderWithProviders(<SleepTimer />, {
    baby: { activeBaby: baby, babies: [baby] },
  });
  await flush();
  return view;
}

async function click(el: HTMLElement) {
  fireEvent.click(el);
  await flush();
}

function seedRunning(elapsedSec: number) {
  const startTime = new Date(NOW.getTime() - elapsedSec * 1000).toISOString();
  fake.seed(TABLE, { id: "s-1", baby_id: baby.id, type: "NAP", start_time: startTime });
  useSleepStore.setState({
    timers: { [baby.id]: { ...EMPTY_SLEEP_DRAFT, sessionId: "s-1", startTime } },
  });
}

describe("SleepTimer (characterization)", () => {
  it("renders_idle_state", async () => {
    const { container } = await mount();

    expect(screen.getByRole("button", { name: "Iniciar soneca" })).toBeInTheDocument();
    expect(screen.getByText("toque para iniciar")).toBeInTheDocument();
    expect(screen.getByText("próxima soneca")).toBeInTheDocument();
    // 30 min awake of a 75 min window (6–8 weeks) → 45 min left.
    expect(screen.getByText("45 min")).toBeInTheDocument();
    // Fallback bubble: 09:00 + 45 min.
    expect(screen.getByText("09:45")).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Tipo de sono" });
    expect(group).toHaveTextContent("Soneca");
    expect(group).toHaveTextContent("Noturno");
    expect(screen.getByRole("button", { name: /Soneca/, pressed: true })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Opções avançadas" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(screen.queryByLabelText("Notas sobre o sono")).not.toBeInTheDocument();

    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders_ai_window_bubbles", async () => {
    holder.ai = {
      windowStart: "09:40",
      suggestedNapTime: "10:00",
      windowEnd: "10:20",
      kind: "NAP",
    } as Partial<AISuggestion>;
    await mount();

    expect(screen.getByText("09:40")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByText("10:20")).toBeInTheDocument();
  });

  it("renders_running_session_from_store", async () => {
    seedRunning(754);
    const { container } = await mount();

    expect(screen.getByRole("button", { name: "Parar sono" })).toBeInTheDocument();
    expect(screen.getByText("00:12:34")).toBeInTheDocument();
    expect(screen.getByText("SONECA")).toBeInTheDocument();
    expect(screen.getByText("parar")).toBeInTheDocument();
    expect(screen.getByLabelText("Notas sobre o sono")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Soneca/, pressed: true })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Noturno/ })).toBeDisabled();

    expect(container.firstChild).toMatchSnapshot();

    await flush(1000);
    expect(screen.getByText("00:12:35")).toBeInTheDocument();
  });

  it("backdate_chip_starts_with_offset", async () => {
    await mount();

    await click(screen.getByRole("button", { name: "Opções avançadas" }));
    expect(screen.getByText("Iniciou há quanto tempo?")).toBeInTheDocument();
    await click(screen.getByRole("button", { name: "10 min" }));
    expect(screen.getByRole("button", { name: "10 min" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("desde 08:50")).toBeInTheDocument();

    await click(screen.getByRole("button", { name: "Iniciar soneca" }));
    await flush();

    const rows = fake.rows(TABLE);
    expect(rows).toHaveLength(1);
    expect(rows[0].start_time).toBe(new Date(NOW.getTime() - 10 * 60_000).toISOString());
    expect(screen.getByRole("button", { name: "Parar sono" })).toBeInTheDocument();
  });

  it("renders_advanced_controls", async () => {
    await mount();

    await click(screen.getByRole("button", { name: "Opções avançadas" }));
    await click(screen.getByRole("button", { name: "Horário" }));
    expect(screen.getByRole("button", { name: "Horário" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Às:")).toHaveValue("09:00");
    expect(screen.getByText("desde 09:00")).toBeInTheDocument();
    expect(screen.getByText("Condições do ambiente")).toBeInTheDocument();

    const panel = screen.getByText("Iniciou há quanto tempo?").parentElement?.parentElement;
    expect(panel).toMatchSnapshot();
  });

  it("stop_opens_post_sleep_review", async () => {
    seedRunning(600);
    await mount();

    await click(screen.getByRole("button", { name: "Parar sono" }));
    await flush();

    expect(fake.rows(TABLE)[0].end_time).not.toBeNull();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Como foi o sono?")).toBeInTheDocument();
    // The modal dialog hides the rest of the page from the a11y tree.
    expect(
      screen.getByRole("button", { name: "Iniciar soneca", hidden: true })
    ).toBeInTheDocument();
    expect(useSleepStore.getState().timers[baby.id]).toBeUndefined();
  });

  it.fails("fallback_time_bubble_has_no_hydration_mismatch", async () => {
    // As on the server/first client render: no baby loaded yet, so the wake
    // window is not loading and the fallback bubble is eligible.
    const babyCtx: BabyContextValue = {
      babies: [],
      activeBaby: null,
      setActiveBaby: () => {},
      isLoading: false,
    };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const html = renderToString(
      <BabyContext.Provider value={babyCtx}>
        <QueryClientProvider client={client}>
          <SleepTimer />
        </QueryClientProvider>
      </BabyContext.Provider>
    );
    // No clock-dependent HH:mm in the server markup.
    expect(html).not.toMatch(/\d{2}:\d{2}/);

    // After mount the bubble shows the next-sleep time.
    renderWithProviders(<SleepTimer />, { baby: babyCtx });
    await flush();
    const minutes = getMinutesUntilNextNap(0, getWakeWindowRange(12));
    const expected = format(new Date(NOW.getTime() + minutes * 60_000), "HH:mm");
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
