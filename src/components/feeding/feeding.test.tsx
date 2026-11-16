// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { renderWithProviders } from "@/test/render";
import type { Baby, FeedingSuggestion, FeedingTimelineItem } from "@/types";
import { deleteBottleFeeding, logBottleFeeding } from "@/lib/supabase/feedingQueries";
import { BottleQuickLog } from "./BottleQuickLog";
import { BreastfeedingTimer } from "./BreastfeedingTimer";
import { FeedingTimeline } from "./FeedingTimeline";
import FeedingPage from "@/app/(dashboard)/feeding/page";
import { useFeedingStore } from "@/store/feedingStore";
import { toast } from "sonner";

const holder = vi.hoisted(() => ({
  feedings: [] as unknown[],
  suggestion: undefined as unknown,
  suggestionLoading: false,
  search: "",
  canWrite: true,
  breast: {
    isRunning: true,
    initialSide: "LEFT" as "LEFT" | "RIGHT",
    start: vi.fn(),
    switchSide: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/supabase/feedingQueries", () => ({
  logBottleFeeding: vi.fn(async () => ({ data: { id: "new-1" }, error: null })),
  logSolidFeeding: vi.fn(async () => ({ data: { id: "new-2" }, error: null })),
  getFeedingTimeline: vi.fn(async () => ({ data: holder.feedings, error: null })),
  deleteBottleFeeding: vi.fn(async () => ({ error: null })),
  deleteBreastfeedingSession: vi.fn(async () => ({ error: null })),
  deleteSolidFeeding: vi.fn(async () => ({ error: null })),
}));
vi.mock("@/hooks/useCanWrite", () => ({
  useCanWrite: () => ({ canWrite: holder.canWrite, isLoading: false }),
}));
vi.mock("@/lib/family/recordFeedingActivity", () => ({ recordFeedingActivity: vi.fn() }));
vi.mock("@/hooks/useFeedingSuggestion", () => ({
  useFeedingSuggestion: () => ({ data: holder.suggestion, isLoading: holder.suggestionLoading }),
}));
vi.mock("@/hooks/useBreastfeedingTimer", () => ({
  useBreastfeedingTimer: () => {
    const [side, setSide] = useState(holder.breast.initialSide);
    return {
      isRunning: holder.breast.isRunning,
      activeSide: side,
      liveLeftSec: 402,
      liveRightSec: 250,
      handleStart: holder.breast.start,
      handleSwitchSide: (s: "LEFT" | "RIGHT") => {
        holder.breast.switchSide(s);
        setSide(s);
      },
      handleStop: holder.breast.stop,
    };
  },
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(holder.search),
  usePathname: () => "/feeding",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

// 09:00 in America/Sao_Paulo.
const NOW = new Date("2026-01-01T12:00:00.000Z");
const baby = { id: "baby-1", name: "Lia", birth_date: "2025-06-01" } as Baby;

function bottle(id: string, startTime: string, volume: number): FeedingTimelineItem {
  return {
    id,
    type: "BOTTLE",
    startTime,
    endTime: startTime,
    summary: `${volume}ml`,
    raw: { id, volume_ml: volume, milk_type: "FORMULA", start_time: startTime, notes: null },
  } as unknown as FeedingTimelineItem;
}

function breast(id: string, startTime: string, left: number, right: number): FeedingTimelineItem {
  return {
    id,
    type: "BREAST",
    startTime,
    endTime: startTime,
    summary: "",
    raw: { id, side_left_sec: left, side_right_sec: right, start_time: startTime, notes: null },
  } as unknown as FeedingTimelineItem;
}

function mount(ui: React.ReactElement) {
  return renderWithProviders(ui, { baby: { activeBaby: baby, babies: [baby] } });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  holder.feedings = [];
  holder.suggestion = undefined;
  holder.suggestionLoading = false;
  holder.search = "";
  holder.canWrite = true;
  holder.breast.isRunning = true;
  holder.breast.initialSide = "LEFT";
  window.history.replaceState(null, "", "/feeding");
  useFeedingStore.setState({ timers: {} });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("BottleQuickLog", () => {
  it("steps_10ml_up_and_down_with_floor_0", () => {
    mount(<BottleQuickLog />);
    const amount = screen.getByTestId("bottle-volume");
    expect(amount).toHaveTextContent("120");
    fireEvent.click(screen.getByRole("button", { name: "Aumentar 10 ml" }));
    expect(amount).toHaveTextContent("130");
    fireEvent.click(screen.getByRole("button", { name: "Diminuir 10 ml" }));
    fireEvent.click(screen.getByRole("button", { name: "Diminuir 10 ml" }));
    expect(amount).toHaveTextContent("110");
    for (let i = 0; i < 20; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Diminuir 10 ml" }));
    }
    expect(amount).toHaveTextContent(/^0\s*ml$/);
  });

  it("registers_the_bottle_with_the_shown_volume", async () => {
    mount(<BottleQuickLog />);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar 10 ml" }));
    fireEvent.click(screen.getByRole("button", { name: "Leite materno" }));
    expect(screen.getByRole("button", { name: "Leite materno" })).toHaveAttribute("aria-pressed", "true");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Registrar mamadeira" }));
    });
    expect(logBottleFeeding).toHaveBeenCalledWith(expect.anything(), "baby-1", {
      volume_ml: 130,
      milk_type: "BREAST_MILK",
    });
  });
});

describe("BottleQuickLog without a baby", () => {
  it("points to Mais › Bebês with a link, never to Configurações", async () => {
    renderWithProviders(<BottleQuickLog />, {
      baby: { activeBaby: null, babies: [] },
      profile: { isNannyMode: false },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Registrar mamadeira" }));
    });
    expect(logBottleFeeding).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
    const [message, opts] = vi.mocked(toast.error).mock.calls[0];
    expect(message).toBe("Adicione um bebê em Mais › Bebês");
    cleanup();
    render(<>{(opts as { action?: React.ReactNode })?.action}</>);
    expect(screen.getByRole("link", { name: "Abrir Bebês" })).toHaveAttribute("href", "/more/babies");
  });

  it("nanny mode: asks the family admin, with no link to Bebês (she cannot open it)", async () => {
    renderWithProviders(<BottleQuickLog />, {
      baby: { activeBaby: null, babies: [] },
      profile: { isNannyMode: true },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Registrar mamadeira" }));
    });
    expect(toast.error).toHaveBeenCalledTimes(1);
    const [message, opts] = vi.mocked(toast.error).mock.calls[0];
    expect(message).toBe(
      "Ainda não há bebê na família. Peça a quem administra a família para adicionar o bebê."
    );
    expect((opts as { action?: unknown } | undefined)?.action).toBeUndefined();
  });
});

describe("BreastfeedingTimer", () => {
  it("tapping_the_other_side_switches_it", () => {
    mount(<BreastfeedingTimer />);
    const left = screen.getByRole("button", { name: /Esquerdo/ });
    const right = screen.getByRole("button", { name: /Direito/ });
    expect(left).toHaveAttribute("aria-pressed", "true");
    expect(right).toHaveAttribute("aria-pressed", "false");
    expect(left).toHaveTextContent("06:42");
    expect(right).toHaveTextContent("04:10");
    fireEvent.click(right);
    expect(holder.breast.switchSide).toHaveBeenCalledWith("RIGHT");
    expect(right).toHaveAttribute("aria-pressed", "true");
    expect(left).toHaveAttribute("aria-pressed", "false");
  });

  it("terminar_mamada_calls_stop", () => {
    mount(<BreastfeedingTimer />);
    fireEvent.click(screen.getByRole("button", { name: "Terminar mamada" }));
    expect(holder.breast.stop).toHaveBeenCalledTimes(1);
  });

  it("stopped_tapping_a_side_starts_on_it", () => {
    holder.breast.isRunning = false;
    mount(<BreastfeedingTimer />);
    expect(screen.queryByRole("button", { name: "Terminar mamada" })).toBeNull();
    // Stopped, each side says what one tap does.
    expect(screen.getByRole("button", { name: "Começar pelo esquerdo" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Começar pelo direito" }));
    expect(holder.breast.start).toHaveBeenCalledWith("RIGHT");
  });
});

describe("FeedingTimeline (Hoje)", () => {
  it("sums_today_bottles_in_ml_and_edits_on_tap", async () => {
    const yesterday = bottle("b-old", "2025-12-31T20:00:00.000Z", 200); // 17:00 on Dec 31
    const first = bottle("b-1", "2026-01-01T09:30:00.000Z", 180); // 06:30
    const second = bottle("b-2", "2026-01-01T04:00:00.000Z", 460); // 01:00
    const nurse = breast("f-1", "2026-01-01T07:00:00.000Z", 600, 480); // 04:00
    holder.feedings = [first, nurse, second, yesterday];
    const onEdit = vi.fn();
    mount(<FeedingTimeline onEdit={onEdit} />);
    const today = await screen.findByRole("region", { name: "Hoje" });
    expect(within(today).getByText("640 ml no total")).toBeInTheDocument();
    expect(within(today).getByRole("button", { name: /Peito.*04:00, esquerdo e direito.*18 min/ })).toBeInTheDocument();
    fireEvent.click(within(today).getByRole("button", { name: /Mamadeira.*06:30.*180 ml/ }));
    expect(onEdit).toHaveBeenCalledWith(first);
  });
});

describe("FeedingTimeline running feeding", () => {
  it("a_running_breastfeed_links_to_the_timer_instead_of_editing", async () => {
    const running = { ...breast("f-run", "2026-01-01T11:50:00.000Z", 120, 0), endTime: null } as FeedingTimelineItem;
    holder.feedings = [running];
    const onEdit = vi.fn();
    mount(<FeedingTimeline onEdit={onEdit} />);
    const today = await screen.findByRole("region", { name: "Hoje" });
    const row = within(today).getByRole("link", { name: /Peito.*08:50, esquerdo.*Em andamento/ });
    expect(row).toHaveAttribute("href", "/feeding?tipo=peito");
    fireEvent.click(row);
    expect(onEdit).not.toHaveBeenCalled();
    expect(within(today).queryByRole("button")).toBeNull();
  });

  it("a_viewer_sees_the_running_breastfeed_as_plain_text_no_link", async () => {
    const running = { ...breast("f-run", "2026-01-01T11:50:00.000Z", 120, 0), endTime: null } as FeedingTimelineItem;
    holder.feedings = [running];
    mount(<FeedingTimeline readOnly />);
    const today = await screen.findByRole("region", { name: "Hoje" });
    expect(within(today).getByText("Em andamento")).toBeInTheDocument();
    expect(within(today).queryByRole("link")).toBeNull();
    expect(within(today).queryByRole("button")).toBeNull();
  });
});

describe("FeedingPage", () => {
  it("shows_next_feeding_with_the_explanation", async () => {
    holder.suggestion = {
      suggestedTime: "10:20",
      minutesUntilSuggested: 80,
      avgIntervalMinutes: 180,
      confidence: "high",
      reasoning: "",
    } satisfies FeedingSuggestion;
    mount(<FeedingPage />);
    const card = await screen.findByRole("region", { name: "Próxima mamada" });
    expect(within(card).getByText("10:20")).toBeInTheDocument();
    expect(card).toHaveTextContent("Em cerca de 1h 20min, pelo intervalo das últimas mamadas");
    expect(screen.getByRole("heading", { level: 1, name: "Comida" })).toBeInTheDocument();
  });

  it("empty_history_shows_empty_next_feeding", async () => {
    holder.suggestion = {
      suggestedTime: "",
      minutesUntilSuggested: 0,
      avgIntervalMinutes: null,
      confidence: "low",
      reasoning: "",
    } satisfies FeedingSuggestion;
    mount(<FeedingPage />);
    const card = await screen.findByRole("region", { name: "Próxima mamada" });
    expect(card).not.toHaveTextContent("Pela faixa esperada");
    expect(card).toHaveTextContent("Registre a primeira mamada");
  });

  it("tab_lives_in_tipo_query", async () => {
    holder.search = "tipo=peito";
    holder.breast.isRunning = false;
    mount(<FeedingPage />);
    const tabs = await screen.findByRole("radiogroup", { name: "Tipo de alimentação" });
    expect(within(tabs).getByRole("radio", { name: "Peito" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(tabs).getByRole("radio", { name: "Sólidos" }));
    expect(within(tabs).getByRole("radio", { name: "Sólidos" })).toHaveAttribute("aria-checked", "true");
    expect(window.location.search).toBe("?tipo=solidos");
    expect(screen.getByRole("button", { name: "Banana" })).toBeInTheDocument();
  });

  it("running_feeding_pins_peito_so_stopping_keeps_the_tab", async () => {
    useFeedingStore.setState({
      timers: {
        [baby.id]: {
          sessionId: "f-run",
          startTime: NOW.toISOString(),
          activeSide: "LEFT",
          sideLeftSec: 0,
          sideRightSec: 0,
          sideStartedAt: NOW.toISOString(),
        },
      },
    });
    mount(<FeedingPage />);
    const tabs = await screen.findByRole("radiogroup", { name: "Tipo de alimentação" });
    expect(within(tabs).getByRole("radio", { name: "Peito" })).toHaveAttribute("aria-checked", "true");
    expect(window.location.search).toBe("?tipo=peito");

    // "Terminar mamada" clears the running entry.
    act(() => useFeedingStore.setState({ timers: {} }));
    expect(within(tabs).getByRole("radio", { name: "Peito" })).toHaveAttribute("aria-checked", "true");
  });

  it("registrar_mamada_passada_opens_the_form", async () => {
    mount(<FeedingPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Registrar mamada passada" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("editing_an_item_can_delete_it_after_confirming", async () => {
    const first = bottle("b-1", "2026-01-01T09:30:00.000Z", 180);
    holder.feedings = [first];
    mount(<FeedingPage />);
    const today = await screen.findByRole("region", { name: "Hoje" });
    fireEvent.click(within(today).getByRole("button", { name: /Mamadeira.*06:30.*180 ml/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Editar alimentação")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));
    expect(deleteBottleFeeding).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar exclusão" }));
    });
    expect(deleteBottleFeeding).toHaveBeenCalledWith(expect.anything(), "b-1");
  });
});

describe("FeedingPage para quem só vê", () => {
  it("mostra os registros sem Registrar, Iniciar, Editar ou Excluir", async () => {
    holder.canWrite = false;
    holder.breast.isRunning = false;
    holder.feedings = [bottle("b1", "2026-01-01T11:00:00.000Z", 120)];
    mount(<FeedingPage />);
    const today = await screen.findByRole("region", { name: "Hoje" });

    expect(screen.getByText("Você tem acesso só para ver")).toBeInTheDocument();
    expect(within(today).getByText("120 ml no total")).toBeInTheDocument();
    expect(within(today).queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /Registrar|Iniciar|Editar|Excluir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Tipo de alimentação" })).not.toBeInTheDocument();
    expect(screen.queryByText(/registre uma mamada passada/)).not.toBeInTheDocument();
  });

  it("quem registra não vê o aviso", async () => {
    mount(<FeedingPage />);
    await act(async () => {});
    expect(screen.queryByText("Você tem acesso só para ver")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Registrar mamada passada/ })).toBeInTheDocument();
  });
});
