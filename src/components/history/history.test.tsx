// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { formatInTimeZone } from "date-fns-tz";
import { renderWithProviders } from "@/test/render";
import type { Baby, SleepSession } from "@/types";
import { deleteSleepSession, getSleepSessions } from "@/lib/supabase/queries/sleep";
import { WeekStrip } from "./WeekStrip";
import HistoryPage from "@/app/(dashboard)/history/page";

const holder = vi.hoisted(() => ({
  sessions: [] as unknown[],
  search: "",
  canWrite: true,
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/supabase/queries/sleep", () => ({
  getSleepSessions: vi.fn(async () => ({ data: holder.sessions, error: null })),
  deleteSleepSession: vi.fn(async () => ({ error: null })),
}));
vi.mock("@/hooks/useCanWrite", () => ({
  useCanWrite: () => ({ canWrite: holder.canWrite, isLoading: false }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(holder.search),
  usePathname: () => "/history",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const TZ = "America/Sao_Paulo";
// Thursday, 1 Jan 2026, 09:00 in America/Sao_Paulo.
const NOW = new Date("2026-01-01T12:00:00.000Z");
// About 30 weeks old: 14h a day expected.
const baby = { id: "baby-1", name: "Lia", birth_date: "2025-06-01" } as Baby;

function sleep(id: string, type: "NAP" | "NIGHT_SLEEP", start: string, end: string | null, extra: Partial<SleepSession> = {}) {
  return {
    id,
    baby_id: "baby-1",
    type,
    start_time: start,
    end_time: end,
    duration_min: end ? Math.round((Date.parse(end) - Date.parse(start)) / 60_000) : null,
    quality: null,
    how_fell_asleep: null,
    wake_reason: null,
    notes: null,
    location: null,
    room_temp_celsius: null,
    weather_condition: null,
    sleep_sack_type: null,
    sleep_sack_tog: null,
    clothing_description: null,
    ...extra,
  } as unknown as SleepSession;
}

// 10:00 to 10:40 local, fell asleep in arms.
const nap = sleep("nap-1", "NAP", "2026-01-01T13:00:00.000Z", "2026-01-01T13:40:00.000Z", { how_fell_asleep: "colo" });
// 22:00 on Dec 31 to 06:00 on Jan 1 local.
const night = sleep("night-1", "NIGHT_SLEEP", "2026-01-01T01:00:00.000Z", "2026-01-01T09:00:00.000Z");

function mount(ui: React.ReactElement) {
  return renderWithProviders(ui, { baby: { activeBaby: baby, babies: [baby] } });
}

const key = (d: Date) => formatInTimeZone(d, TZ, "yyyy-MM-dd");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  holder.sessions = [];
  holder.search = "";
  holder.canWrite = true;
  window.history.replaceState(null, "", "/history");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("WeekStrip", () => {
  const days = () => within(screen.getByRole("group", { name: "Escolher o dia" })).getAllByRole("button");
  const labels = () => days().map((d) => d.textContent);

  it("shows_exactly_the_7_days_ending_today_and_selects_on_tap", () => {
    const onSelect = vi.fn();
    mount(<WeekStrip selected={NOW} onSelect={onSelect} timeZone={TZ} />);
    expect(labels()).toEqual(["sex26", "sáb27", "dom28", "seg29", "ter30", "qua31", "hoje1"]);
    const today = days()[6];
    expect(today).toHaveAttribute("aria-current", "date");
    expect(today).toHaveAccessibleName("Hoje, 1 de janeiro");
    expect(days().filter((d) => d.hasAttribute("aria-current"))).toHaveLength(1);
    // No sideways scrolling: the week is paged with buttons.
    expect(screen.getByRole("group", { name: "Escolher o dia" }).className).not.toMatch(/overflow-x-(auto|scroll)/);

    fireEvent.click(days()[1]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(key(onSelect.mock.calls[0][0])).toBe("2025-12-27");
  });

  it("next_week_is_disabled_on_the_current_week", () => {
    mount(<WeekStrip selected={NOW} onSelect={() => {}} timeZone={TZ} />);
    expect(screen.getByRole("button", { name: "Próxima semana" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Semana anterior" })).toBeEnabled();
  });

  it("previous_week_shows_the_prior_7_days_back_to_30_days", () => {
    const onSelect = vi.fn();
    mount(<WeekStrip selected={NOW} onSelect={onSelect} timeZone={TZ} />);
    fireEvent.click(screen.getByRole("button", { name: "Semana anterior" }));
    expect(labels()).toEqual(["sex19", "sáb20", "dom21", "seg22", "ter23", "qua24", "qui25"]);
    expect(screen.getByText("19 de dezembro a 25 de dezembro")).toBeInTheDocument();
    // The selected day is not in this week.
    expect(days().some((d) => d.hasAttribute("aria-current"))).toBe(false);
    expect(screen.getByRole("button", { name: "Próxima semana" })).toBeEnabled();
    fireEvent.click(days()[0]);
    expect(key(onSelect.mock.calls[0][0])).toBe("2025-12-19");

    // 30 days ending Jan 1 start on Dec 3: four full weeks back to Dec 5, then
    // a short page with only Dec 3 and 4, so no day shows on two pages.
    fireEvent.click(screen.getByRole("button", { name: "Semana anterior" }));
    expect(labels()).toEqual(["sex12", "sáb13", "dom14", "seg15", "ter16", "qua17", "qui18"]);
    fireEvent.click(screen.getByRole("button", { name: "Semana anterior" }));
    expect(labels()).toEqual(["sex5", "sáb6", "dom7", "seg8", "ter9", "qua10", "qui11"]);
    expect(screen.getByRole("button", { name: "Semana anterior" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Semana anterior" }));
    expect(labels()).toEqual(["qua3", "qui4"]);
    expect(screen.getByText("3 de dezembro a 4 de dezembro")).toBeInTheDocument();
    // The short page sits against the right edge, next to the following week.
    expect(days()[0].style.gridColumnStart).toBe("6");
    expect(screen.getByRole("button", { name: "Semana anterior" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Próxima semana" }));
    expect(labels()).toEqual(["sex5", "sáb6", "dom7", "seg8", "ter9", "qua10", "qui11"]);
    fireEvent.click(screen.getByRole("button", { name: "Próxima semana" }));
    fireEvent.click(screen.getByRole("button", { name: "Próxima semana" }));
    fireEvent.click(screen.getByRole("button", { name: "Próxima semana" }));
    expect(labels()).toEqual(["sex26", "sáb27", "dom28", "seg29", "ter30", "qua31", "hoje1"]);
    expect(screen.getByRole("button", { name: "Próxima semana" })).toBeDisabled();
  });

  it("a_selected_day_on_the_short_oldest_page_opens_it", () => {
    mount(<WeekStrip selected={new Date("2025-12-04T15:00:00.000Z")} onSelect={() => {}} timeZone={TZ} />);
    expect(labels()).toEqual(["qua3", "qui4"]);
    expect(screen.getByRole("button", { current: "date" })).toHaveTextContent("qui4");
  });

  it("a_selected_day_in_an_older_week_opens_that_week", () => {
    mount(<WeekStrip selected={new Date("2025-12-20T15:00:00.000Z")} onSelect={() => {}} timeZone={TZ} />);
    expect(screen.getByRole("button", { current: "date" })).toHaveTextContent("sáb20");
    expect(labels()).toEqual(["sex19", "sáb20", "dom21", "seg22", "ter23", "qua24", "qui25"]);
  });
});

describe("HistoryPage", () => {
  it("empty_day_shows_the_empty_state_without_a_status", async () => {
    mount(<HistoryPage />);
    expect(await screen.findByText("Nenhum sono registrado neste dia")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar sono" })).toBeInTheDocument();
    expect(document.querySelector("[data-slot=status-pill]")).toBeNull();
    expect(screen.queryByText("Dentro do esperado")).toBeNull();
    expect(screen.queryByText(/^0/)).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Registro" })).toBeInTheDocument();
  });

  it("shows_the_day_total_status_and_the_sessions", async () => {
    holder.sessions = [nap, night];
    mount(<HistoryPage />);
    // Today is not over: the total is "so far" and a low total is not judged yet.
    const summary = await screen.findByRole("region", { name: "Sono até agora" });
    // 40 min of nap + 6h of the night that fell on this day.
    expect(summary).toHaveTextContent("6h 40min");
    expect(within(summary).queryByText("Abaixo do esperado")).toBeNull();
    expect(summary.querySelector("[data-slot=status-pill]")).toBeNull();
    const list = screen.getByRole("list", { name: "Sonos do dia" });
    expect(within(list).getByRole("button", { name: /Soneca.*10:00 a 10:40, adormeceu no colo.*40 min/ })).toBeInTheDocument();
    expect(within(list).getByRole("button", { name: /Noite.*22:00 a 06:00.*8h/ })).toBeInTheDocument();
    expect(list.textContent).not.toContain("·");
  });

  it("filtro_sonecas_lists_only_naps", async () => {
    holder.sessions = [nap, night];
    mount(<HistoryPage />);
    const list = await screen.findByRole("list", { name: "Sonos do dia" });
    expect(within(list).getAllByRole("button")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Sonecas" }));
    expect(screen.getByRole("button", { name: "Sonecas" })).toHaveAttribute("aria-pressed", "true");
    const rows = within(screen.getByRole("list", { name: "Sonos do dia" })).getAllByRole("button");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Soneca");
    expect(window.location.search).toBe("?tipo=sonecas");
  });

  it("tipo_noite_from_the_url_lists_only_nights", async () => {
    holder.search = "tipo=noite";
    holder.sessions = [nap, night];
    mount(<HistoryPage />);
    const list = await screen.findByRole("list", { name: "Sonos do dia" });
    const rows = within(list).getAllByRole("button");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Noite");
    expect(screen.getByRole("button", { name: "Noite" })).toHaveAttribute("aria-pressed", "true");
  });

  it("dia_from_the_url_picks_the_day_and_tapping_a_day_writes_it", async () => {
    holder.search = "dia=2025-12-30";
    mount(<HistoryPage />);
    expect(await screen.findByRole("button", { current: "date" })).toHaveTextContent("ter30");
    await screen.findByText("Nenhum sono registrado neste dia");
    // Fetched from the day before, so a night that began then is included.
    const [, , from, to] = vi.mocked(getSleepSessions).mock.calls.at(-1)!;
    expect(from.toISOString()).toBe("2025-12-29T03:00:00.000Z");
    expect(to.toISOString()).toBe("2025-12-31T02:59:59.999Z");

    fireEvent.click(screen.getByRole("button", { name: "domingo, 28 de dezembro" }));
    expect(screen.getByRole("button", { current: "date" })).toHaveTextContent("dom28");
    expect(window.location.search).toBe("?dia=2025-12-28");
  });

  it("tapping_a_row_opens_the_form_to_edit_and_delete_it", async () => {
    holder.sessions = [nap, night];
    mount(<HistoryPage />);
    const list = await screen.findByRole("list", { name: "Sonos do dia" });
    fireEvent.click(within(list).getByRole("button", { name: /Soneca/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Editar registro")).toBeInTheDocument();
    expect((document.getElementById("start_time_input") as HTMLInputElement).value).toBe("10:00");
    expect((document.getElementById("end_time_input") as HTMLInputElement).value).toBe("10:40");

    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));
    expect(deleteSleepSession).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar exclusão" }));
    });
    expect(deleteSleepSession).toHaveBeenCalledWith(expect.anything(), "nap-1");
  });

  it("adicionar_sono_on_a_past_day_starts_on_that_day", async () => {
    holder.search = "dia=2025-12-30";
    mount(<HistoryPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar sono" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Registrar sono passado")).toBeInTheDocument();
    expect((document.getElementById("start_date") as HTMLInputElement).value).toBe("2025-12-30");
    expect((document.getElementById("end_date") as HTMLInputElement).value).toBe("2025-12-30");
  });

  it("past_day_below_target_says_abaixo", async () => {
    holder.search = "dia=2025-12-31";
    // 22:00 on Dec 31 to 06:00 on Jan 1: 2h fall on Dec 31.
    holder.sessions = [night];
    mount(<HistoryPage />);
    const summary = await screen.findByRole("region", { name: "Sono no dia" });
    expect(summary).toHaveTextContent("2h");
    expect(within(summary).getByText("Abaixo do esperado")).toBeInTheDocument();
  });

  it("today_above_target_says_acima_before_the_day_ends", async () => {
    // 23:00 local on Jan 1.
    vi.setSystemTime(new Date("2026-01-02T02:00:00.000Z"));
    // 00:00 to 16:30 local: 16h30, over 14h + 1h.
    holder.sessions = [sleep("long", "NIGHT_SLEEP", "2026-01-01T03:00:00.000Z", "2026-01-01T19:30:00.000Z")];
    mount(<HistoryPage />);
    const summary = await screen.findByRole("region", { name: "Sono até agora" });
    expect(summary).toHaveTextContent("16h 30min");
    expect(within(summary).getByText("Acima do esperado")).toBeInTheDocument();
  });

  it("running_night_counts_up_to_now_in_the_total", async () => {
    // Asleep since 23:00 on Dec 31, still sleeping at 09:00 on Jan 1.
    holder.sessions = [sleep("run", "NIGHT_SLEEP", "2026-01-01T02:00:00.000Z", null)];
    mount(<HistoryPage />);
    const summary = await screen.findByRole("region", { name: "Sono até agora" });
    await waitFor(() => expect(summary).toHaveTextContent("9h"));
    expect(summary).not.toHaveTextContent("0 min");
    const list = screen.getByRole("list", { name: "Sonos do dia" });
    // Still running: not editable here, the row opens the home instead.
    const row = within(list).getByRole("link", { name: /Noite.*23:00 até agora.*Em andamento/ });
    expect(row).toHaveAttribute("href", "/app");
    fireEvent.click(row);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(within(list).queryByRole("button")).toBeNull();
  });

  it("failed_load_says_so_instead_of_an_empty_day", async () => {
    vi.mocked(getSleepSessions).mockResolvedValueOnce({ data: null, error: { message: "boom" } } as never);
    mount(<HistoryPage />);
    expect(await screen.findByText("Não foi possível carregar este dia.")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum sono registrado neste dia")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Nenhum sono registrado neste dia")).toBeInTheDocument();
  });

  it("dia_in_an_older_week_opens_that_week", async () => {
    holder.search = "dia=2025-12-10";
    mount(<HistoryPage />);
    expect(await screen.findByRole("button", { current: "date" })).toHaveTextContent("qua10");
    expect(screen.getByRole("button", { name: "Próxima semana" })).toBeEnabled();
  });
});

describe("HistoryPage para quem só vê", () => {
  it("lista os sonos sem Adicionar, Editar ou Excluir", async () => {
    holder.canWrite = false;
    holder.sessions = [night, nap];
    mount(<HistoryPage />);
    const list = await screen.findByRole("list", { name: "Sonos do dia" });

    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText("Você tem acesso só para ver")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Adicionar|Registrar|Editar|Excluir/ })).not.toBeInTheDocument();
  });
});
