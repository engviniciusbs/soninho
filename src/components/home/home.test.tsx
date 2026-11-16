// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { createFakeSupabase, type FakeSupabase } from "@/test/fakeSupabase";
import { BabyContext, type BabyContextValue } from "@/components/providers/BabyProvider";
import {
  UserProfileContext,
  type UserProfileContextValue,
} from "@/components/providers/UserProfileProvider";
import { EMPTY_SLEEP_DRAFT, SLEEP_STORE_VERSION, useSleepStore } from "@/store/sleepStore";
import type { AISuggestion, Baby, FeedingTimelineItem, SleepSession } from "@/types";
import { getSleepSessionDetails, updateSleepSession } from "@/lib/supabase/queries/sleep";
import { toast } from "sonner";
import AppHomePage from "@/app/(dashboard)/app/page";

const holder = vi.hoisted(() => ({
  client: null as unknown,
  ai: undefined as unknown,
  lastSession: null as unknown,
  recent: {} as Record<string, unknown[]>,
  feedings: {} as Record<string, unknown[]>,
  regression: null as unknown,
  notes: null as unknown,
  toasts: vi.fn(),
  noDbRestore: false,
  canWrite: true,
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => holder.client }));
vi.mock("@/lib/supabase/queries/sleep", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/supabase/queries/sleep")>();
  return {
    ...orig,
    getLastSleepSession: vi.fn(async () => ({ data: holder.lastSession, error: null })),
    getRecentSessions: vi.fn(async (_c: unknown, babyId: string) => ({
      data: holder.recent[babyId] ?? [],
      error: null,
    })),
    // Spied so tests can see which fields a save sends.
    updateSleepSession: vi.fn(orig.updateSleepSession),
    // Spied so tests can fail or delay the session read.
    getSleepSessionDetails: vi.fn(orig.getSleepSessionDetails),
    // Switchable so a test can rule out the DB restore of an open session.
    getActiveSleepSession: vi.fn((...args: Parameters<typeof orig.getActiveSleepSession>) =>
      holder.noDbRestore
        ? Promise.resolve({ data: null, error: null })
        : orig.getActiveSleepSession(...args)
    ),
  };
});
vi.mock("@/lib/supabase/feedingQueries", () => ({
  getFeedingTimeline: vi.fn(async (_c: unknown, babyId: string) => ({
    data: holder.feedings[babyId] ?? [],
    error: null,
  })),
}));
vi.mock("@/hooks/useAISuggestions", () => ({
  useAISuggestions: () => ({ data: holder.ai }),
}));
vi.mock("@/hooks/useRegression", () => ({
  useRegression: () => ({ data: holder.regression, isLoading: false }),
}));
vi.mock("@/hooks/useCanWrite", () => ({
  useCanWrite: () => ({ canWrite: holder.canWrite, isLoading: false }),
}));
vi.mock("@/hooks/useFamilyActivityToasts", () => ({
  useFamilyActivityToasts: (enabled: boolean) => holder.toasts(enabled),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/app",
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const TABLE = "sleep_sessions";
// 09:00 in America/Sao_Paulo.
const NOW = new Date("2026-01-01T12:00:00.000Z");
const helena = { id: "baby-h", name: "Helena", birth_date: "2025-04-01" } as Baby;
const otto = { id: "baby-o", name: "Otto", birth_date: "2025-09-01" } as Baby;
let fake: FakeSupabase;

function session(over: Partial<SleepSession>): SleepSession {
  return {
    id: Math.random().toString(36).slice(2),
    baby_id: helena.id,
    type: "NAP",
    start_time: "",
    end_time: null,
    ...over,
  } as SleepSession;
}

function nights(babyId: string, count: number): SleepSession[] {
  return Array.from({ length: count }, (_, i) =>
    session({
      baby_id: babyId,
      type: "NIGHT_SLEEP",
      // Night i: 19:30 local of Dec (30 - i) → 06:10 local of Dec (31 - i).
      start_time: `2025-12-${String(30 - i).padStart(2, "0")}T19:30:00-03:00`,
      end_time: `2025-12-${String(31 - i).padStart(2, "0")}T06:10:00-03:00`,
    })
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  fake = createFakeSupabase();
  holder.client = fake.client;
  holder.ai = undefined;
  holder.regression = null;
  holder.notes = null;
  holder.recent = {};
  holder.feedings = {};
  holder.toasts.mockClear();
  holder.noDbRestore = false;
  holder.canWrite = true;
  // Back to the real read (a test may have failed or delayed it).
  vi.mocked(getSleepSessionDetails).mockReset();
  holder.lastSession = {
    id: "prev",
    end_time: new Date(NOW.getTime() - 30 * 60_000).toISOString(),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).startsWith("/api/family/notes") && holder.notes) {
        return new Response(JSON.stringify(holder.notes));
      }
      return new Response(null, { status: 404 });
    })
  );
  localStorage.clear();
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

function tree(baby: Partial<BabyContextValue>, nanny: boolean, client: QueryClient): ReactElement {
  const babyValue: BabyContextValue = {
    babies: [helena, otto],
    activeBaby: helena,
    setActiveBaby: () => {},
    isLoading: false,
    ...baby,
  };
  const profile: UserProfileContextValue = {
    profile: null,
    isLoading: false,
    isNannyMode: nanny,
    refreshProfile: async () => {},
  };
  return (
    <BabyContext.Provider value={babyValue}>
      <UserProfileContext.Provider value={profile}>
        <QueryClientProvider client={client}>
          <AppHomePage />
        </QueryClientProvider>
      </UserProfileContext.Provider>
    </BabyContext.Provider>
  );
}

async function mount(opts: { baby?: Partial<BabyContextValue>; nanny?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(tree(opts.baby ?? {}, opts.nanny ?? false, client));
  await flush();
  return {
    ...view,
    rerenderWith: async (baby: Partial<BabyContextValue>) => {
      view.rerender(tree(baby, opts.nanny ?? false, client));
      await flush();
    },
  };
}

async function click(el: HTMLElement) {
  fireEvent.click(el);
  await flush();
}

function seedRunning(babyId: string, type: "NAP" | "NIGHT_SLEEP", elapsedSec: number) {
  const startTime = new Date(NOW.getTime() - elapsedSec * 1000).toISOString();
  fake.seed(TABLE, { id: "s-1", baby_id: babyId, type, start_time: startTime });
  useSleepStore.setState({
    timers: { [babyId]: { ...EMPTY_SLEEP_DRAFT, sleepType: type, sessionId: "s-1", startTime } },
  });
}

const nightAi = {
  kind: "NIGHT_SLEEP",
  suggestedNapTime: "09:30",
  windowStart: "09:20",
  windowEnd: "09:50",
  reasoning: "Ela costuma dormir neste horário.",
  confidence: "high",
  minutesUntilSuggested: 30,
  // The instant the home counts down to with its own clock (09:30 local).
  suggestedAtIso: "2026-01-01T12:30:00.000Z",
  windowStartIso: "2026-01-01T12:20:00.000Z",
  windowEndIso: "2026-01-01T12:50:00.000Z",
} as AISuggestion;

describe("Home", () => {
  it("awake_night_next_shows_moon_time_and_start_night", async () => {
    holder.ai = nightAi;
    await mount();

    const hero = screen.getByRole("region", { name: "Previsão de sono" });
    expect(within(hero).getByText("Sono noturno")).toBeInTheDocument();
    expect(within(hero).getByText("09:30")).toBeInTheDocument();
    expect(within(hero).getByText("Em cerca de 30 min")).toBeInTheDocument();
    expect(within(hero).getByTestId("art-moon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Por que esse horário?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar sono noturno" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Noturno" })).toHaveAttribute("aria-checked", "true");
    expect(holder.toasts).toHaveBeenCalledWith(true);
  });

  it("awake_nap_next_shows_sun_and_start_nap", async () => {
    holder.ai = { ...nightAi, kind: "NAP" };
    await mount();

    const hero = screen.getByRole("region", { name: "Previsão de sono" });
    expect(within(hero).getByText("Soneca")).toBeInTheDocument();
    expect(within(hero).getByTestId("art-sun")).toBeInTheDocument();
    expect(within(hero).queryByTestId("art-moon")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar soneca" })).toBeInTheDocument();
  });

  it("why_sheet_shows_reasoning_and_line_icon_feedback", async () => {
    holder.ai = nightAi;
    await mount();

    await click(screen.getByRole("button", { name: "Por que esse horário?" }));
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText("Ela costuma dormir neste horário.")).toBeInTheDocument();
    expect(within(sheet).getByText("Horário sugerido: 09:20 a 09:50")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Não útil" })).toBeInTheDocument();
    await click(within(sheet).getByRole("button", { name: "Útil" }));
    const calls = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls;
    const vote = calls.find(([url]) => url === "/api/suggestions/feedback");
    expect(JSON.parse(String(vote?.[1].body))).toMatchObject({
      babyId: helena.id,
      vote: "up",
      suggestedTime: "09:30",
    });
    expect(within(sheet).getByText("Obrigado pelo feedback!")).toBeInTheDocument();
  });

  it("start_night_calls_handleStart_and_shows_sleeping", async () => {
    holder.ai = nightAi;
    await mount();

    await click(screen.getByRole("button", { name: "Iniciar sono noturno" }));
    await flush();

    const rows = fake.rows(TABLE);
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("NIGHT_SLEEP");
    expect(screen.getByText("Sono noturno em andamento")).toBeInTheDocument();
  });

  it("running_shows_ring_and_acordou_stops", async () => {
    seedRunning(helena.id, "NAP", 754);
    await mount();

    expect(screen.getByText("Soneca em andamento")).toBeInTheDocument();
    expect(screen.getByText("00:12:34")).toBeInTheDocument();
    expect(screen.getByText("Desde 08:47")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Previsão de sono" })).not.toBeInTheDocument();

    await click(screen.getByRole("button", { name: "Acordou" }));
    await flush();

    expect(fake.rows(TABLE)[0].end_time).not.toBeNull();
    expect(screen.getByText("Como foi o sono?")).toBeInTheDocument();
  });

  it("notes_written_during_sleep_are_saved_to_the_session", async () => {
    seedRunning(helena.id, "NAP", 600);
    await mount();

    await click(screen.getByRole("button", { name: "Anotar algo" }));
    fireEvent.change(screen.getByLabelText("Notas sobre o sono"), {
      target: { value: "Acordou e voltou a dormir" },
    });
    await click(screen.getByRole("button", { name: "Salvar nota" }));
    await flush();

    expect(fake.rows(TABLE)[0].notes).toBe("Acordou e voltou a dormir");
  });

  it("persisted_v1_timer_rehydrates_as_sleeping", async () => {
    const startTime = new Date(NOW.getTime() - 3600_000).toISOString();
    // The open row exists (so the live sync keeps the timer), but the DB
    // restore is off: only localStorage can bring the timer back.
    fake.seed(TABLE, { id: "s-old", baby_id: helena.id, type: "NIGHT_SLEEP", start_time: startTime });
    holder.noDbRestore = true;
    // Clear the store first: persist's setState writes storage, so seeding
    // after it would be overwritten.
    useSleepStore.setState({ timers: {}, draft: { ...EMPTY_SLEEP_DRAFT } });
    localStorage.setItem(
      "soninho-timer",
      JSON.stringify({
        state: {
          activeBabyId: helena.id,
          timers: {
            [helena.id]: {
              ...EMPTY_SLEEP_DRAFT,
              sleepType: "NIGHT_SLEEP",
              sessionId: "s-old",
              startTime,
            },
          },
          draft: { ...EMPTY_SLEEP_DRAFT },
        },
        version: SLEEP_STORE_VERSION,
      })
    );
    await useSleepStore.persist.rehydrate();
    expect(useSleepStore.getState().timers[helena.id]?.sessionId).toBe("s-old");

    await mount();

    expect(screen.getByText("Sono noturno em andamento")).toBeInTheDocument();
    expect(screen.getByText("01:00:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acordou" })).toBeInTheDocument();
  });

  it("restored_session_shows_stored_environment_and_closing_writes_nothing", async () => {
    const startTime = new Date(NOW.getTime() - 600_000).toISOString();
    // Started on another phone: the DB row has the environment, the local
    // timer entry (restoreFromSession) has none.
    fake.seed(TABLE, {
      id: "s-2",
      baby_id: helena.id,
      type: "NAP",
      start_time: startTime,
      room_temp_celsius: 22,
      sleep_sack_type: "flannel",
      sleep_sack_tog: 1,
      notes: "Nota da outra cuidadora",
    });
    await mount();

    expect(screen.getByText("Soneca em andamento")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "22°C" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "TOG 1.0" })).toBeInTheDocument();

    await click(screen.getByRole("button", { name: "Ambiente" }));
    await click(screen.getByRole("button", { name: "Pronto" }));
    await click(screen.getByRole("button", { name: "Anotar algo" }));
    expect(screen.getByLabelText("Notas sobre o sono")).toHaveValue("Nota da outra cuidadora");
    await click(screen.getByRole("button", { name: "Salvar nota" }));
    await flush();

    expect(updateSleepSession).not.toHaveBeenCalled();
    const row = fake.rows(TABLE)[0];
    expect(row.room_temp_celsius).toBe(22);
    expect(row.sleep_sack_tog).toBe(1);
    expect(row.notes).toBe("Nota da outra cuidadora");
  });

  it("editing_only_tog_sends_only_tog", async () => {
    const startTime = new Date(NOW.getTime() - 600_000).toISOString();
    fake.seed(TABLE, {
      id: "s-3",
      baby_id: helena.id,
      type: "NAP",
      start_time: startTime,
      room_temp_celsius: 22,
      sleep_sack_type: "flannel",
      sleep_sack_tog: 1,
    });
    await mount();

    await click(screen.getByRole("button", { name: "Ambiente" }));
    await click(screen.getByRole("button", { name: "TOG 2.5" }));
    await click(screen.getByRole("button", { name: "Pronto" }));
    await flush();

    expect(updateSleepSession).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateSleepSession).mock.calls[0][2]).toEqual({ sleep_sack_tog: 2.5 });
    const row = fake.rows(TABLE)[0];
    expect(row.sleep_sack_tog).toBe(2.5);
    expect(row.room_temp_celsius).toBe(22);
  });

  it("note_is_saved_when_the_session_reads_failed_before", async () => {
    seedRunning(helena.id, "NAP", 600);
    // The first read (on mount) and the sheet-open read fail; the save reads again.
    const failed = { data: null, error: { message: "offline" } } as unknown as Awaited<
      ReturnType<typeof getSleepSessionDetails>
    >;
    vi.mocked(getSleepSessionDetails).mockResolvedValueOnce(failed).mockResolvedValueOnce(failed);
    await mount();

    await click(screen.getByRole("button", { name: "Anotar algo" }));
    fireEvent.change(screen.getByLabelText("Notas sobre o sono"), {
      target: { value: "Dormiu no colo" },
    });
    await click(screen.getByRole("button", { name: "Salvar nota" }));
    await flush();

    expect(fake.rows(TABLE)[0].notes).toBe("Dormiu no colo");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("note_that_cannot_be_saved_says_so_instead_of_vanishing", async () => {
    seedRunning(helena.id, "NAP", 600);
    vi.mocked(getSleepSessionDetails).mockResolvedValue({
      data: null,
      error: { message: "offline" },
    } as unknown as Awaited<ReturnType<typeof getSleepSessionDetails>>);
    await mount();

    await click(screen.getByRole("button", { name: "Anotar algo" }));
    fireEvent.change(screen.getByLabelText("Notas sobre o sono"), {
      target: { value: "Dormiu no colo" },
    });
    await click(screen.getByRole("button", { name: "Salvar nota" }));
    await flush();

    expect(toast.error).toHaveBeenCalledWith("Não foi possível salvar a nota");
    expect(updateSleepSession).not.toHaveBeenCalled();
  });

  it("save_after_failed_reads_sends_only_the_edited_field", async () => {
    const startTime = new Date(NOW.getTime() - 600_000).toISOString();
    fake.seed(TABLE, { id: "s-1", baby_id: helena.id, type: "NAP", start_time: startTime, room_temp_celsius: 22 });
    useSleepStore.setState({
      timers: { [helena.id]: { ...EMPTY_SLEEP_DRAFT, sessionId: "s-1", startTime } },
    });
    // The mount read and the sheet-open read fail; only the save's read answers.
    const failed = { data: null, error: { message: "offline" } } as unknown as Awaited<
      ReturnType<typeof getSleepSessionDetails>
    >;
    vi.mocked(getSleepSessionDetails).mockResolvedValueOnce(failed).mockResolvedValueOnce(failed);
    await mount();

    await click(screen.getByRole("button", { name: "Ambiente" }));
    await click(screen.getByRole("button", { name: "Chuvoso" }));
    await click(screen.getByRole("button", { name: "Pronto" }));
    await flush();

    expect(updateSleepSession).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateSleepSession).mock.calls[0][2]).toEqual({ weather_condition: "rainy" });
    expect(fake.rows(TABLE)[0].room_temp_celsius).toBe(22);
    // The sheet now shows the server's temperature.
    expect(screen.getByRole("button", { name: "22°C" })).toBeInTheDocument();
  });

  it("late_sheet_open_read_does_not_overwrite_a_note_being_typed", async () => {
    seedRunning(helena.id, "NAP", 600);
    await mount();
    // Another caregiver saved a note meanwhile; the sheet-open read is slow.
    fake.rows(TABLE)[0].notes = "Nota antiga";
    const orig = vi.mocked(getSleepSessionDetails).getMockImplementation()!;
    vi.mocked(getSleepSessionDetails).mockImplementationOnce(
      (...args) =>
        new Promise((resolve) => setTimeout(() => resolve(orig(...args)), 2000)) as ReturnType<
          typeof getSleepSessionDetails
        >
    );

    await click(screen.getByRole("button", { name: "Anotar algo" }));
    fireEvent.change(screen.getByLabelText("Notas sobre o sono"), {
      target: { value: "Nota nova" },
    });
    await flush(2500);

    expect(screen.getByLabelText("Notas sobre o sono")).toHaveValue("Nota nova");
    await click(screen.getByRole("button", { name: "Salvar nota" }));
    await flush();
    expect(fake.rows(TABLE)[0].notes).toBe("Nota nova");
  });

  it("overdue_comes_from_the_suggestion_not_the_wake_window", async () => {
    // Wake window already past its max, but the suggestion is still ahead.
    holder.lastSession = {
      id: "prev",
      end_time: new Date(NOW.getTime() - 300 * 60_000).toISOString(),
    };
    holder.ai = { ...nightAi, suggestedNapTime: "09:30", minutesUntilSuggested: 30 };
    await mount();

    const hero = screen.getByRole("region", { name: "Previsão de sono" });
    expect(within(hero).getByText("09:30")).toBeInTheDocument();
    expect(within(hero).queryByText("Já passou do horário previsto")).not.toBeInTheDocument();
  });

  it("collapsed_backdate_stays_visible_and_can_be_cleared", async () => {
    await mount();

    await click(screen.getByRole("button", { name: "Começou antes?" }));
    await click(screen.getByRole("button", { name: "10 min" }));
    await click(screen.getByRole("button", { name: "Começou antes?" }));

    expect(screen.queryByText("Iniciou há quanto tempo?")).not.toBeInTheDocument();
    expect(screen.getByText("Começou às 08:50")).toBeInTheDocument();
    await click(screen.getByRole("button", { name: "Limpar" }));
    expect(screen.queryByText("Começou às 08:50")).not.toBeInTheDocument();
  });

  it("wake_estimate_hidden_with_fewer_than_3_nights", async () => {
    holder.recent[helena.id] = nights(helena.id, 2);
    seedRunning(helena.id, "NIGHT_SLEEP", 600);
    await mount();

    expect(screen.getByText("Sono noturno em andamento")).toBeInTheDocument();
    expect(screen.getByText("Última mamada")).toBeInTheDocument();
    expect(screen.queryByText("Estimativa de despertar")).not.toBeInTheDocument();
  });

  it("wake_estimate_shown_with_3_nights", async () => {
    holder.recent[helena.id] = nights(helena.id, 3);
    seedRunning(helena.id, "NIGHT_SLEEP", 600);
    await mount();

    expect(screen.getByText("Estimativa de despertar")).toBeInTheDocument();
    expect(screen.getByText("~06:10")).toBeInTheDocument();
  });

  it("today_card_shows_last_sleep_and_last_feeding", async () => {
    holder.recent[helena.id] = [
      session({ start_time: "2026-01-01T07:09:00-03:00", end_time: "2026-01-01T07:49:00-03:00" }),
    ];
    holder.feedings[helena.id] = [
      {
        id: "f1",
        type: "BOTTLE",
        startTime: "2026-01-01T06:30:00-03:00",
        endTime: null,
        summary: "",
        raw: { volume_ml: 180 },
      } as unknown as FeedingTimelineItem,
    ];
    await mount();

    const today = screen.getByRole("region", { name: "Hoje" });
    expect(within(today).getByText("Último sono")).toBeInTheDocument();
    expect(within(today).getByText("Soneca, 07:09 a 07:49")).toBeInTheDocument();
    expect(within(today).getByText("40 min")).toBeInTheDocument();
    expect(within(today).getByText("Mamadeira, 06:30")).toBeInTheDocument();
    expect(within(today).getByText("180 ml")).toBeInTheDocument();
    expect(within(today).getByRole("link", { name: /Ver registro/ })).toHaveAttribute(
      "href",
      "/history"
    );
  });

  it("today_card_says_em_andamento_for_a_running_breastfeed", async () => {
    holder.feedings[helena.id] = [
      {
        id: "f-run",
        type: "BREAST",
        startTime: "2026-01-01T08:50:00-03:00",
        endTime: null,
        summary: "",
        raw: { side_left_sec: 0, side_right_sec: 0 },
      } as unknown as FeedingTimelineItem,
    ];
    await mount();

    const today = screen.getByRole("region", { name: "Hoje" });
    expect(within(today).getByText("Peito, 08:50")).toBeInTheDocument();
    expect(within(today).getByText("Em andamento")).toBeInTheDocument();
    expect(within(today).queryByText("0 min")).toBeNull();
  });

  it("regression_notice_only_when_detected", async () => {
    holder.regression = { detected: false, summary: "Tudo calmo" };
    const first = await mount();
    expect(screen.queryByRole("link", { name: /Ver análise/ })).not.toBeInTheDocument();
    first.unmount();

    holder.regression = { detected: true, summary: "Sono caiu nas últimas noites" };
    await mount();
    expect(screen.getByRole("link", { name: /Ver análise/ })).toHaveAttribute(
      "href",
      "/analytics/regression"
    );
  });

  it("nanny_sees_notes_but_no_insights_or_history_link", async () => {
    holder.ai = nightAi;
    holder.regression = { detected: true, summary: "Sono caiu" };
    holder.notes = {
      data: [
        {
          id: "n1",
          baby_id: helena.id,
          author_id: "u1",
          author_name: "Ana",
          body: "Ela comeu bem no almoço",
          created_at: "2026-01-01T11:00:00.000Z",
        },
      ],
      memberCount: 2,
      currentUserRole: "caregiver",
      currentUserId: "u2",
    };
    await mount({ nanny: true });

    expect(screen.getByText("Ela comeu bem no almoço")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver todos" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ver registro/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Por que esse horário?" })).not.toBeInTheDocument();
    expect(screen.queryByText("Tempo acordada")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ver análise/ })).not.toBeInTheDocument();
    // The prediction itself stays.
    expect(screen.getByRole("region", { name: "Previsão de sono" })).toBeInTheDocument();
  });

  it("switching_baby_updates_name_avatar_and_today", async () => {
    holder.recent[helena.id] = [
      session({ start_time: "2026-01-01T07:09:00-03:00", end_time: "2026-01-01T07:49:00-03:00" }),
    ];
    holder.recent[otto.id] = [
      session({
        baby_id: otto.id,
        start_time: "2026-01-01T06:00:00-03:00",
        end_time: "2026-01-01T07:30:00-03:00",
      }),
    ];
    const view = await mount();
    expect(screen.getByText("Helena")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Helena" })).toHaveTextContent("H");
    expect(screen.getByText("Soneca, 07:09 a 07:49")).toBeInTheDocument();

    await view.rerenderWith({ activeBaby: otto });

    expect(screen.getByText("Otto")).toBeInTheDocument();
    expect(screen.queryByText("Helena")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Otto" })).toHaveTextContent("O");
    expect(screen.getByText("Soneca, 06:00 a 07:30")).toBeInTheDocument();
    expect(screen.getByText("1h 30min")).toBeInTheDocument();
  });

  it("nanny_with_no_baby_gets_no_add_baby_action", async () => {
    await mount({ baby: { babies: [], activeBaby: null }, nanny: true });
    expect(screen.getByText(/Ainda não há bebê na família/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Adicionar bebê/ })).toBeNull();
  });

  it("no_babies_invites_to_more_babies", async () => {
    await mount({ baby: { babies: [], activeBaby: null } });
    expect(screen.getByRole("link", { name: /Adicionar bebê/ })).toHaveAttribute(
      "href",
      "/more/babies"
    );
  });

  it("viewer_sees_the_data_but_no_start_or_stop", async () => {
    holder.canWrite = false;
    holder.ai = nightAi;
    await mount();

    expect(screen.getByText("Você tem acesso só para ver")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Previsão de sono" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Iniciar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Começou antes/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Tipo de sono" })).not.toBeInTheDocument();
  });

  it("viewer_sees_a_running_sleep_without_acordou_or_edits", async () => {
    holder.canWrite = false;
    seedRunning(helena.id, "NAP", 600);
    await mount();

    expect(screen.getByText("Soneca em andamento")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Acordou/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Anotar algo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ambiente|Temperatura|TOG/ })).not.toBeInTheDocument();
    expect(screen.getByText("Você tem acesso só para ver")).toBeInTheDocument();
  });

  it("writer_sees_no_view_only_notice", async () => {
    await mount();
    expect(screen.queryByText("Você tem acesso só para ver")).not.toBeInTheDocument();
  });
});
