// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { SleepBarChart } from "./SleepBarChart";
import { SleepQualityTrend } from "./SleepQualityTrend";

afterEach(cleanup);

const bars = [
  { date: "14/11", napHours: 2.5, nightHours: 10.9 },
  { date: "15/11", napHours: 2, nightHours: 11 },
  { date: "16/11", napHours: 0, nightHours: 6 },
];
const points = [
  { date: "14/11", avgDuration: 48 },
  { date: "15/11", avgDuration: null },
  { date: "16/11", avgDuration: 40 },
];

/** The x-axis tick labels, once Recharts has drawn (it renders after a tick). */
async function xTicks(container: HTMLElement) {
  const sel = 'text.recharts-cartesian-axis-tick-value[orientation="bottom"]';
  await waitFor(() => expect(container.querySelector(sel)).not.toBeNull());
  return [...container.querySelectorAll(sel)].map((t) => t.textContent);
}

/** Nothing inside an aria-hidden subtree can take focus (axe aria-hidden-focus). */
async function expectNoFocusableInsideHidden(container: HTMLElement) {
  await xTicks(container);
  const hidden = [...container.querySelectorAll('[aria-hidden="true"]')];
  expect(hidden.length).toBeGreaterThan(0);
  for (const h of hidden) {
    const focusable = h.querySelectorAll('[tabindex]:not([tabindex="-1"]), a[href], button, input, select, textarea');
    expect(focusable).toHaveLength(0);
  }
  expect(container.querySelector('[role="application"]')).toBeNull();
}

describe("SleepBarChart", () => {
  it("draws_the_chart_with_today_named_on_the_last_tick", async () => {
    const { container } = render(<SleepBarChart data={bars} recommendedHours={14} />);
    const ticks = await xTicks(container);
    expect(ticks.at(-1)).toBe("hoje");
    expect(ticks).not.toContain("16/11");
  });

  it("y_axis_ticks_are_whole_hours", async () => {
    const small = [
      { date: "14/11", napHours: 0.5, nightHours: 1 },
      { date: "15/11", napHours: 0.4, nightHours: 0.8 },
    ];
    const { container } = render(<SleepBarChart data={small} recommendedHours={2} />);
    const sel = 'text.recharts-cartesian-axis-tick-value[orientation="left"]';
    await waitFor(() => expect(container.querySelector(sel)).not.toBeNull());
    const ticks = [...container.querySelectorAll(sel)].map((t) => t.textContent);
    expect(ticks.every((t) => /^\d+h$/.test(t ?? ""))).toBe(true);
  });

  it("hides_the_svg_from_assistive_tech_without_focusable_content_and_offers_a_table", async () => {
    const { container } = render(<SleepBarChart data={bars} recommendedHours={14} />);
    await expectNoFocusableInsideHidden(container);
    const table = screen.getByRole("table", { name: "Sono por dia" });
    const rows = within(table).getAllByRole("row").map((r) => r.textContent);
    expect(rows).toEqual(["DiaNoiteSonecas", "14/1110h 54min2h 30min", "15/1111h2h", "hoje6h0 min"]);
  });
});

describe("SleepQualityTrend", () => {
  it("names_today_on_the_last_tick", async () => {
    const { container } = render(<SleepQualityTrend data={points} caption="Duração média das sonecas" />);
    const ticks = await xTicks(container);
    expect(ticks.at(-1)).toBe("hoje");
  });

  it("hides_the_svg_without_focusable_content_and_offers_a_table", async () => {
    const { container } = render(<SleepQualityTrend data={points} caption="Duração média das sonecas" />);
    await expectNoFocusableInsideHidden(container);
    const table = screen.getByRole("table", { name: "Duração média das sonecas" });
    const rows = within(table).getAllByRole("row").map((r) => r.textContent);
    expect(rows).toEqual(["DiaValor", "14/1148 min", "15/11sem dado", "hoje40 min"]);
  });

  it("names_the_table_by_the_visible_title_and_the_measure", () => {
    render(
      <>
        <h3 id="t">Qualidade média por dia</h3>
        <SleepQualityTrend data={points} labelledBy="t" valueHeader="Nota (1 a 5)" unit="" />
      </>
    );
    const table = screen.getByRole("table", { name: "Qualidade média por dia" });
    expect(table.querySelector("caption")).toBeNull();
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Dia", "Nota (1 a 5)"]);
  });
});
