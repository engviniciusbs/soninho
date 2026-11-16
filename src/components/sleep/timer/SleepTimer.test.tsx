// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { format } from "date-fns";
import { renderWithProviders } from "@/test/render";
import { stable } from "@/test/dom";
import { createFakeSupabase, type FakeSupabase } from "@/test/fakeSupabase";
import { BabyContext, type BabyContextValue } from "@/components/providers/BabyProvider";
import { EMPTY_SLEEP_DRAFT, useSleepStore } from "@/store/sleepStore";
import { getWakeWindowRange, wakeWindowMidpoint } from "@/lib/sleep/wakeWindows";
import type { AISuggestion, Baby } from "@/types";
import { computeNapSuggestion } from "@/lib/sleep/computeNapSuggestion";
import { SleepTimer } from "../SleepTimer";

const holder = vi.hoisted(() => ({
  client: null as unknown,
  ai: undefined as unknown,
  lastSession: null as unknown,
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => holder.client }));
vi.mock("@/lib/supabase/queries/sleep", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase/queries/sleep")>()),
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
    const hero = screen.getByRole("region", { name: "Previsão de sono" });
    expect(within(hero).getByText("Soneca")).toBeInTheDocument();
    // No suggestion: the middle of the 60–75 min window (6–8 weeks), as the
    // suggestion does: 08:30 + 68 min = 09:38, rounded to 09:40.
    expect(within(hero).getByText("Em cerca de 40 min")).toBeInTheDocument();
    expect(within(hero).getByText("09:40")).toBeInTheDocument();
    const group = screen.getByRole("radiogroup", { name: "Tipo de sono" });
    expect(group).toHaveTextContent("Soneca");
    expect(group).toHaveTextContent("Noturno");
    expect(screen.getByRole("radio", { name: /Soneca/, checked: true })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Começou antes?" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(screen.queryByLabelText("Notas sobre o sono")).not.toBeInTheDocument();

    expect(stable(container.firstChild as Element)).toMatchSnapshot();
  });

  it("renders_ai_window_bubbles", async () => {
    holder.ai = {
      windowStart: "09:40",
      suggestedNapTime: "10:00",
      windowEnd: "10:20",
      kind: "NAP",
      suggestedAtIso: "2026-01-01T13:00:00.000Z", // 10:00 local
    } as Partial<AISuggestion>;
    await mount();

    // The hero shows the suggested time; the window is in "Por que esse horário?".
    const hero = screen.getByRole("region", { name: "Previsão de sono" });
    expect(within(hero).getByText("10:00")).toBeInTheDocument();
    await click(screen.getByRole("button", { name: "Por que esse horário?" }));
    expect(screen.getByText("Janela ideal: 09:40 a 10:20")).toBeInTheDocument();
  });

  it("renders_running_session_from_store", async () => {
    seedRunning(754);
    const { container } = await mount();

    expect(screen.getByRole("button", { name: "Acordou" })).toBeInTheDocument();
    expect(screen.getByText("00:12:34")).toBeInTheDocument();
    expect(screen.getByText("Soneca em andamento")).toBeInTheDocument();
    expect(screen.getByText("Desde 08:47")).toBeInTheDocument();
    // The type can't change while running: the selector is gone.
    expect(screen.queryByRole("radiogroup", { name: "Tipo de sono" })).not.toBeInTheDocument();

    expect(stable(container.firstChild as Element)).toMatchSnapshot();

    await flush(1000);
    expect(screen.getByText("00:12:35")).toBeInTheDocument();

    // Notes are behind "Anotar algo" while running.
    await click(screen.getByRole("button", { name: "Anotar algo" }));
    expect(screen.getByLabelText("Notas sobre o sono")).toBeInTheDocument();
  });

  it("backdate_chip_starts_with_offset", async () => {
    await mount();

    await click(screen.getByRole("button", { name: "Começou antes?" }));
    expect(screen.getByText("Iniciou há quanto tempo?")).toBeInTheDocument();
    await click(screen.getByRole("button", { name: "10 min" }));
    expect(screen.getByRole("button", { name: "10 min" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Começou às 08:50")).toBeInTheDocument();

    await click(screen.getByRole("button", { name: "Iniciar soneca" }));
    await flush();

    const rows = fake.rows(TABLE);
    expect(rows).toHaveLength(1);
    expect(rows[0].start_time).toBe(new Date(NOW.getTime() - 10 * 60_000).toISOString());
    expect(screen.getByRole("button", { name: "Acordou" })).toBeInTheDocument();
  });

  it("renders_advanced_controls", async () => {
    await mount();

    await click(screen.getByRole("button", { name: "Começou antes?" }));
    await click(screen.getByRole("button", { name: "Horário" }));
    expect(screen.getByRole("button", { name: "Horário" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Às:")).toHaveValue("09:00");
    expect(screen.getByText("Começou às 09:00")).toBeInTheDocument();

    const panel = screen.getByRole("group", { name: "Iniciou há quanto tempo?" });
    expect(stable(panel)).toMatchSnapshot();

    // The environment is set during the sleep (spec §8.3): "Ambiente" chip.
    seedRunning(600);
    await flush();
    await click(screen.getByRole("button", { name: "Ambiente" }));
    expect(screen.getByText("Condições do ambiente")).toBeInTheDocument();
  });

  it("stop_opens_post_sleep_review", async () => {
    seedRunning(600);
    await mount();

    await click(screen.getByRole("button", { name: "Acordou" }));
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

  it("fallback_time_bubble_has_no_hydration_mismatch", async () => {
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
    // No last sleep: the middle of the window counted from now.
    const expected = format(new Date(wakeWindowMidpoint(NOW.getTime(), getWakeWindowRange(12))), "HH:mm");
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  describe("auto-switch of the type selector", () => {
    const napSuggestion = {
      windowStart: "02:20",
      suggestedNapTime: "02:30",
      windowEnd: "02:40",
      kind: "NAP",
    } as Partial<AISuggestion>;

    it("does not switch to Soneca at 02:05", async () => {
      vi.setSystemTime(new Date("2026-01-01T05:05:00.000Z")); // 02:05 local
      useSleepStore.setState({ draft: { ...EMPTY_SLEEP_DRAFT, sleepType: "NIGHT_SLEEP" } });
      holder.ai = napSuggestion;
      await mount();

      expect(screen.getByRole("radio", { name: /Noturno/, checked: true })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Iniciar sono noturno/i })).toBeInTheDocument();
    });

    it("switches to Noturno at 02:05 when the suggestion is the night", async () => {
      vi.setSystemTime(new Date("2026-01-01T05:05:00.000Z")); // 02:05 local
      holder.ai = { ...napSuggestion, kind: "NIGHT_SLEEP" };
      await mount();

      expect(screen.getByRole("radio", { name: /Noturno/, checked: true })).toBeInTheDocument();
    });

    it("switches during the day (09:00)", async () => {
      useSleepStore.setState({ draft: { ...EMPTY_SLEEP_DRAFT, sleepType: "NIGHT_SLEEP" } });
      holder.ai = { ...napSuggestion, suggestedNapTime: "09:30" };
      await mount();

      expect(screen.getByRole("radio", { name: /Soneca/, checked: true })).toBeInTheDocument();
    });
  });

  describe("live next-sleep forecast (spec #2)", () => {
    it("the same suggestion counts down with the clock and turns overdue", async () => {
      vi.setSystemTime(new Date("2026-01-01T13:00:00.000Z")); // 10:00 local
      holder.lastSession = { id: "prev", end_time: "2026-01-01T12:30:00.000Z" };
      holder.ai = {
        kind: "NAP",
        windowStart: "11:00",
        suggestedNapTime: "11:30",
        windowEnd: "12:00",
        minutesUntilSuggested: 90,
        suggestedAtIso: "2026-01-01T14:30:00.000Z", // 11:30 local
        windowStartIso: "2026-01-01T14:00:00.000Z",
        windowEndIso: "2026-01-01T15:00:00.000Z",
      } as Partial<AISuggestion>;
      await mount();

      const hero = screen.getByRole("region", { name: "Previsão de sono" });
      expect(within(hero).getByText("11:30")).toBeInTheDocument();
      expect(within(hero).getByText("Em cerca de 1h 30min")).toBeInTheDocument();

      await flush(60 * 60_000); // 11:00
      expect(within(hero).getByText("Em cerca de 30 min")).toBeInTheDocument();

      await flush(45 * 60_000); // 11:45
      expect(within(hero).getByText("Agora")).toBeInTheDocument();
      expect(within(hero).getByText("Já passou do horário previsto")).toBeInTheDocument();
      expect(within(hero).queryByText(/Em cerca de/)).not.toBeInTheDocument();
    });

    it("the fallback without a suggestion also turns overdue with the clock", async () => {
      await mount();
      const hero = screen.getByRole("region", { name: "Previsão de sono" });
      expect(within(hero).getByText("09:40")).toBeInTheDocument();

      await flush(41 * 60_000); // 09:41
      expect(within(hero).getByText("Agora")).toBeInTheDocument();
      expect(within(hero).getByText("Já passou do horário previsto")).toBeInTheDocument();
    });

    it("a sleep started on another phone shows up within 30 s", async () => {
      await mount();
      expect(screen.getByRole("button", { name: "Iniciar soneca" })).toBeInTheDocument();

      fake.seed(TABLE, {
        id: "other",
        baby_id: baby.id,
        type: "NAP",
        start_time: new Date(NOW.getTime() - 5 * 60_000).toISOString(),
      });
      await flush(30_000);

      expect(screen.getByRole("button", { name: "Acordou" })).toBeInTheDocument();
      expect(screen.getByText("Soneca em andamento")).toBeInTheDocument();
    });

    it("waking at 02:00 after an 18:30 night: at 02:05 the next sleep is the night, live", async () => {
      const now = new Date("2026-01-01T05:05:00.000Z"); // 02:05 local
      vi.setSystemTime(now);
      const lastEnd = "2026-01-01T05:00:00.000Z"; // 02:00 local
      holder.lastSession = { id: "night", end_time: lastEnd, type: "NIGHT_SLEEP" };
      holder.ai = computeNapSuggestion({
        birthDateIso: baby.birth_date,
        lastSleepEndIso: lastEnd,
        lastSessionType: "NIGHT_SLEEP",
        timezone: "America/Sao_Paulo",
        now,
      });
      await mount();

      const hero = screen.getByRole("region", { name: "Previsão de sono" });
      expect(within(hero).getByText("Sono noturno")).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /Noturno/, checked: true })).toBeInTheDocument();
      // 60–75 min window from 02:00: 03:10, counted down by the clock.
      expect(within(hero).getByText("03:10")).toBeInTheDocument();
      expect(within(hero).getByText("Em cerca de 1h 5min")).toBeInTheDocument();
      await flush(30 * 60_000);
      expect(within(hero).getByText("Em cerca de 35 min")).toBeInTheDocument();
    });
  });
});
