// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import type { Baby } from "@/types";
import AnalyticsPage from "@/app/(dashboard)/analytics/page";
import NumbersPage from "@/app/(dashboard)/analytics/numbers/page";
import TrendsPage from "@/app/(dashboard)/analytics/trends/page";
import EnvironmentPage from "@/app/(dashboard)/analytics/environment/page";
import NapsPage from "@/app/(dashboard)/analytics/naps/page";
import QualityPage from "@/app/(dashboard)/analytics/quality/page";
import RegressionPage from "@/app/(dashboard)/analytics/regression/page";

const holder = vi.hoisted(() => ({
  search: "",
  data: {} as Record<string, unknown>,
  regression: null as unknown,
  regressionState: {} as Record<string, unknown>,
}));
const useAnalyticsData = vi.hoisted(() => vi.fn((period: number) => ({ period, ...holder.data })));

vi.mock("@/components/analytics/useAnalyticsData", () => ({ useAnalyticsData }));
vi.mock("@/hooks/useRegression", () => ({
  useRegression: () => ({ data: holder.regression, isLoading: false, ...holder.regressionState }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(holder.search),
  usePathname: () => "/analytics",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));

const baby = { id: "baby-1", name: "Lia", birth_date: "2026-06-01" } as Baby;
const session = { id: "s-1", type: "NAP", start_time: "2026-11-15T13:00:00.000Z", duration_min: 50 };
const bucket = { label: "20–21°C", count: 3, avgQuality: 4.3, avgDurationMin: 95 };

function fakeData(overrides: Record<string, unknown> = {}) {
  return {
    sessions: [session],
    periodSessions: [session],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ageWeeks: 24,
    schedule: { totalSleepHours: 14 },
    last24h: { totalMinutes: 760, longestNightMinutes: 400 },
    statsPeriod: { totalSleepMinutes: 5000, napCount: 17, avgNapDuration: 52, longestStretch: 600 },
    sleepDebt: { targetHours: 14, avgHours: 12.5, debtHours: 1.5, daysAnalyzed: 6 },
    envCorrelation: { temperature: [bucket], sleepSackTog: [], weather: [], bestTemperature: bucket },
    dailyTotals: [{ date: "15/11", totalHours: 12.5, napHours: 2.5, nightHours: 10 }],
    napCounts: [{ date: "15/11", count: 3 }],
    nightStretch: [{ date: "15/11", hours: 6.3 }],
    heatmapData: [{ dayOfWeek: 1, hour: 9, count: 2 }],
    avgNapTrend: [{ date: "15/11", avgDuration: 48 }],
    todayNaps: 2,
    yesterdayNaps: 3,
    periodSummary: { daysWithData: 6, avgSleepMinutes: 730, avgNapsPerDay: 2.4, longestNightMinutes: 380 },
    dailyQuality: [{ date: "15/11", avgQuality: 4 }],
    ...overrides,
  };
}

function mount(ui: React.ReactElement) {
  return renderWithProviders(ui, { baby: { activeBaby: baby, babies: [baby] } });
}

const lastPeriod = () => useAnalyticsData.mock.calls.at(-1)?.[0];
const figure = (label: string) => screen.getByText(label).parentElement as HTMLElement;

beforeEach(() => {
  holder.search = "";
  holder.data = fakeData();
  holder.regression = { detected: false, summary: "Nenhum sinal de regressão.", tips: [] };
  holder.regressionState = {};
  window.history.replaceState(null, "", "/analytics");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AnalyticsPage", () => {
  it("defaults_to_7_days_and_switching_to_30_keeps_it_in_the_url", () => {
    mount(<AnalyticsPage />);
    const periods = screen.getByRole("radiogroup", { name: "Período" });
    expect(within(periods).getAllByRole("radio").map((r) => r.textContent)).toEqual(["7 dias", "14 dias", "30 dias"]);
    expect(within(periods).getByRole("radio", { name: "7 dias" })).toHaveAttribute("aria-checked", "true");
    expect(lastPeriod()).toBe(7);

    fireEvent.click(within(periods).getByRole("radio", { name: "30 dias" }));
    expect(lastPeriod()).toBe(30);
    expect(window.location.search).toBe("?periodo=30");
    expect(within(periods).getByRole("radio", { name: "30 dias" })).toHaveAttribute("aria-checked", "true");

    // Back to the default drops the param.
    fireEvent.click(within(periods).getByRole("radio", { name: "7 dias" }));
    expect(lastPeriod()).toBe(7);
    expect(window.location.search).toBe("");
  });

  it("reads_the_period_from_the_url_and_ignores_an_unknown_one", () => {
    holder.search = "periodo=14";
    mount(<AnalyticsPage />);
    expect(lastPeriod()).toBe(14);
    cleanup();

    holder.search = "periodo=90";
    mount(<AnalyticsPage />);
    expect(lastPeriod()).toBe(7);
  });

  it("shows_the_three_figures_of_the_period_from_the_hook", () => {
    mount(<AnalyticsPage />);
    expect(figure("sono por dia")).toHaveTextContent("12h 10min");
    expect(figure("sonecas por dia")).toHaveTextContent("2,4");
    expect(figure("maior noite")).toHaveTextContent("6h 20min");
    expect(
      screen.getByText("Médias de 6 dias completos, sem contar hoje. Maior noite: a mais longa já terminada.")
    ).toBeInTheDocument();
    expect(screen.getByText("Sono por dia", { selector: "h2" })).toBeInTheDocument();
    // The chart's table is named by that heading, not by a caption read again.
    const table = screen.getByRole("table", { name: "Sono por dia" });
    expect(table.querySelector("caption")).toBeNull();
    // The legend names both series.
    const legend = screen.getByRole("list", { name: "Legenda" });
    expect(within(legend).getByText("Noite")).toBeInTheDocument();
    expect(within(legend).getByText("Sonecas")).toBeInTheDocument();
  });

  it("empty_period_shows_the_empty_state_not_zeros", () => {
    holder.data = fakeData({
      sessions: [],
      periodSessions: [],
      periodSummary: { daysWithData: 0, avgSleepMinutes: null, avgNapsPerDay: null, longestNightMinutes: null },
      last24h: { totalMinutes: 0, longestNightMinutes: 0 },
      dailyTotals: [{ date: "15/11", totalHours: 0, napHours: 0, nightHours: 0 }],
    });
    const { container } = mount(<AnalyticsPage />);
    expect(screen.getByText("Nenhum sono registrado neste período.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Registrar um sono" })).toHaveAttribute("href", "/app");
    expect(screen.queryByText("sono por dia")).toBeNull();
    expect(screen.queryByText("Sono por dia", { selector: "h2" })).toBeNull();
    // Scoped to the page: Recharts leaves a hidden text-measuring span on <body>.
    expect(within(container).queryByText(/^0/)).toBeNull();
  });

  it("sleep_only_today_waits_for_a_complete_day_before_the_figures", () => {
    holder.data = fakeData({
      periodSummary: { daysWithData: 0, avgSleepMinutes: null, avgNapsPerDay: null, longestNightMinutes: null },
    });
    mount(<AnalyticsPage />);
    expect(screen.queryByText("sono por dia")).toBeNull();
    expect(screen.getByText("Os números do período aparecem depois do primeiro dia completo.")).toBeInTheDocument();
    expect(screen.getByText("Sono por dia", { selector: "h2" })).toBeInTheDocument();
  });

  it("regression_notice_only_when_detected", () => {
    mount(<AnalyticsPage />);
    expect(screen.queryByText("Possível regressão de sono")).toBeNull();
    cleanup();

    holder.regression = { detected: true, summary: "O sono caiu nos últimos dias.", tips: [] };
    mount(<AnalyticsPage />);
    expect(screen.getByText("Possível regressão de sono")).toBeInTheDocument();
    expect(screen.getByText("O sono caiu nos últimos dias.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver o radar completo" })).toHaveAttribute("href", "/analytics/regression");
  });

  it("lists_the_detail_screens", () => {
    mount(<AnalyticsPage />);
    const href = (name: string) => screen.getByRole("link", { name: new RegExp(`^${name}`) }).getAttribute("href");
    expect(href("Mais números")).toBe("/analytics/numbers");
    expect(href("Tendências")).toBe("/analytics/trends");
    expect(href("Ambiente e sono")).toBe("/analytics/environment");
    expect(href("Padrão de sonecas")).toBe("/analytics/naps");
    expect(href("Qualidade do sono")).toBe("/analytics/quality");
    expect(href("Radar de regressões")).toBe("/analytics/regression");
  });

  it("detail_links_carry_a_non_default_period", () => {
    holder.search = "periodo=30";
    mount(<AnalyticsPage />);
    expect(screen.getByRole("link", { name: /^Mais números/ })).toHaveAttribute("href", "/analytics/numbers?periodo=30");
    expect(screen.getByRole("link", { name: /^Qualidade do sono/ })).toHaveAttribute("href", "/analytics/quality?periodo=30");
  });

  it("failed_load_shows_an_error_with_retry_not_an_empty_state", () => {
    const refetch = vi.fn();
    holder.data = fakeData({ isError: true, sessions: [], periodSessions: [], refetch });
    mount(<AnalyticsPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar a análise.");
    expect(screen.queryByText("Nenhum sono registrado neste período.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("loading_shows_a_skeleton", () => {
    holder.data = fakeData({ isLoading: true, sessions: [], periodSessions: [] });
    const { container } = mount(<AnalyticsPage />);
    expect(container.querySelector("[aria-busy=true]")).not.toBeNull();
    expect(screen.queryByText("Nenhum sono registrado neste período.")).toBeNull();
  });
});

describe("Analytics detail pages", () => {
  const back = () => screen.getByRole("link", { name: "Voltar" });

  it("numbers_keeps_every_current_tile_and_the_period", () => {
    holder.search = "periodo=14";
    mount(<NumbersPage />);
    expect(lastPeriod()).toBe(14);
    expect(screen.getByRole("heading", { level: 1, name: "Mais números" })).toBeInTheDocument();
    expect(back()).toHaveAttribute("href", "/analytics?periodo=14");
    const tile = (label: string) => screen.getByText(label).closest("[data-slot=stat-tile]") as HTMLElement;
    expect(tile("Sono 24h")).toHaveTextContent("12h 40min");
    expect(tile("Sono 24h")).toHaveTextContent("Meta: 14h");
    expect(tile("Débito de sono")).toHaveTextContent("-1h 30min");
    expect(tile("Débito de sono")).toHaveTextContent("Média 12h 30min/dia");
    expect(tile("Média de soneca")).toHaveTextContent("52 min");
    expect(tile("Média de soneca")).toHaveTextContent("17 sonecas em 14 dias");
    expect(tile("Sonecas hoje")).toHaveTextContent("2");
    expect(tile("Sonecas hoje")).toHaveTextContent("Ontem: 3");
    expect(tile("Maior trecho noturno")).toHaveTextContent("6h 40min");
    expect(tile("Maior trecho noturno")).toHaveTextContent("Últimas 24h");
    // Hours are always a duration ("10h 54min"), never a decimal ("10,9h").
    for (const label of ["Sono 24h", "Débito de sono", "Média de soneca", "Maior trecho noturno"]) {
      expect(tile(label).textContent).not.toMatch(/\d+[,.]\d+\s*h/);
    }
  });

  it("numbers_with_an_empty_window_read_sem_dados_not_zero", () => {
    holder.data = fakeData({
      last24h: { totalMinutes: 0, longestNightMinutes: 0 },
      statsPeriod: { totalSleepMinutes: 0, napCount: 0, avgNapDuration: 0, longestStretch: 0 },
    });
    mount(<NumbersPage />);
    const tile = (label: string) => screen.getByText(label).closest("[data-slot=stat-tile]") as HTMLElement;
    for (const label of ["Sono 24h", "Média de soneca", "Maior trecho noturno"]) {
      expect(tile(label)).toHaveTextContent("Sem dados");
      expect(tile(label)).not.toHaveTextContent(/\b0 ?min/);
    }
  });

  it("numbers_debt_reads_em_dia_and_sem_dados_like_today", () => {
    holder.data = fakeData({ sleepDebt: { targetHours: 14, avgHours: 0, debtHours: 14, daysAnalyzed: 0 } });
    mount(<NumbersPage />);
    expect(back()).toHaveAttribute("href", "/analytics");
    const tile = screen.getByText("Débito de sono").closest("[data-slot=stat-tile]") as HTMLElement;
    expect(tile).toHaveTextContent("Sem dados");
    cleanup();

    holder.data = fakeData({ sleepDebt: { targetHours: 14, avgHours: 14.2, debtHours: -0.2, daysAnalyzed: 7 } });
    mount(<NumbersPage />);
    expect(screen.getByText("Débito de sono").closest("[data-slot=stat-tile]")).toHaveTextContent("Em dia");
  });

  it("numbers_for_a_baby_without_history_shows_the_empty_state", () => {
    holder.data = fakeData({ sessions: [], periodSessions: [] });
    mount(<NumbersPage />);
    expect(screen.getByText("Nenhum sono registrado ainda.")).toBeInTheDocument();
    expect(screen.queryByText("Sono 24h")).toBeNull();
  });

  it("trends_shows_the_three_trends", () => {
    holder.search = "periodo=30";
    mount(<TrendsPage />);
    expect(lastPeriod()).toBe(30);
    expect(screen.getByRole("heading", { level: 1, name: "Tendências" })).toBeInTheDocument();
    const titles = [...document.querySelectorAll("[data-slot=card-title]")].map((t) => t.textContent);
    expect(titles).toEqual(["Duração média das sonecas", "Sonecas por dia", "Maior trecho noturno"]);
    // Each chart has its text alternative.
    expect(screen.getByRole("table", { name: "Sonecas por dia" })).toBeInTheDocument();
  });

  it("environment_shows_the_correlation_tables", () => {
    mount(<EnvironmentPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Ambiente e sono" })).toBeInTheDocument();
    expect(screen.getByText(/Melhor faixa de temperatura/)).toHaveTextContent(
      "Melhor faixa de temperatura: 20–21°C, qualidade média 4,3 de 5"
    );
    const table = screen.getByRole("table", { name: "Temperatura" });
    const cells = within(table).getAllByRole("cell").map((c) => c.textContent);
    expect(cells).toEqual(["20–21°C", "3", "4,3", "1h 35min"]);
  });

  it("environment_without_temperature_explains_how_to_fill_it", () => {
    holder.data = fakeData({
      envCorrelation: { temperature: [], sleepSackTog: [], weather: [], bestTemperature: null },
    });
    mount(<EnvironmentPage />);
    expect(
      screen.getByText(/Registre a temperatura do quarto ao iniciar o sono/)
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("naps_shows_the_heatmap", () => {
    const { container } = mount(<NapsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Padrão de sonecas" })).toBeInTheDocument();
    expect(container.querySelector('[title="Seg 9h: 2 sonecas"]')).not.toBeNull();
  });

  it("quality_without_ratings_explains_how_to_fill_it", () => {
    holder.data = fakeData({ dailyQuality: [{ date: "15/11", avgQuality: null }] });
    mount(<QualityPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Qualidade do sono" })).toBeInTheDocument();
    expect(screen.getByText(/Avalie a qualidade ao terminar um sono/)).toBeInTheDocument();
  });

  it("quality_with_ratings_shows_the_trend", () => {
    mount(<QualityPage />);
    expect(screen.getByText("Qualidade média por dia", { selector: "[data-slot=card-title]" })).toBeInTheDocument();
    expect(screen.queryByText(/Avalie a qualidade ao terminar um sono/)).toBeNull();
    // The table is named by the visible title (no second caption) and names the measure.
    const table = screen.getByRole("table", { name: "Qualidade média por dia" });
    expect(table.querySelector("caption")).toBeNull();
    expect(within(table).getByRole("columnheader", { name: "Nota (1 a 5)" })).toBeInTheDocument();
  });

  it("regression_shows_the_full_radar", () => {
    holder.regression = {
      detected: true,
      ageWindow: "4 meses",
      summary: "O sono caiu.",
      explanation: "Saltos de desenvolvimento costumam mexer com o sono.",
      tips: ["Mantenha a rotina."],
    };
    mount(<RegressionPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Radar de regressões" })).toBeInTheDocument();
    expect(back()).toHaveAttribute("href", "/analytics");
    expect(screen.getByText("Saltos de desenvolvimento costumam mexer com o sono.")).toBeInTheDocument();
    expect(screen.getByText("Mantenha a rotina.")).toBeInTheDocument();
    expect(screen.getByText("4 meses")).toBeInTheDocument();
  });

  it("regression_failed_request_shows_the_error_with_retry", () => {
    const refetch = vi.fn();
    holder.regression = undefined;
    holder.regressionState = { isError: true, isPending: false, refetch };
    mount(<RegressionPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível verificar regressões agora.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("regression_without_an_active_baby_does_not_load_forever", () => {
    holder.regression = undefined;
    holder.regressionState = { isPending: true };
    const { container } = renderWithProviders(<RegressionPage />, { baby: { activeBaby: null, babies: [] } });
    expect(container.querySelector("[aria-busy=true]")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("detail_pages_show_errors_with_retry", () => {
    const refetch = vi.fn();
    holder.data = fakeData({ isError: true, refetch });
    mount(<TrendsPage />);
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Tentar de novo" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
