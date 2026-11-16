// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { StarRating } from "./star-rating";

afterEach(cleanup);

function Controlled({ initial = null, spy }: { initial?: number | null; spy?: (v: number | null) => void }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <StarRating
      label="Qualidade do sono"
      value={value}
      onChange={(v) => {
        spy?.(v);
        setValue(v);
      }}
    />
  );
}

const star = (n: number) => screen.getByRole("radio", { name: `${n} de 5 estrelas` });

describe("StarRating", () => {
  it("is a labelled radio group of five stars, with the value checked", () => {
    render(<Controlled initial={3} />);
    expect(screen.getByRole("radiogroup", { name: "Qualidade do sono" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(star(3)).toHaveAttribute("aria-checked", "true");
    expect(star(2)).toHaveAttribute("aria-checked", "false");
    // One tab stop, on the checked star.
    expect(star(3)).toHaveAttribute("tabindex", "0");
    expect(star(1)).toHaveAttribute("tabindex", "-1");
  });

  it("tapping a star selects it; tapping it again clears", async () => {
    const spy = vi.fn();
    render(<Controlled spy={spy} />);
    await userEvent.click(star(4));
    expect(star(4)).toHaveAttribute("aria-checked", "true");
    await userEvent.click(star(4));
    expect(star(4)).toHaveAttribute("aria-checked", "false");
    expect(spy.mock.calls).toEqual([[4], [null]]);
  });

  it("ArrowRight and ArrowLeft move the value and the focus", async () => {
    const spy = vi.fn();
    render(<Controlled initial={2} spy={spy} />);
    star(2).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(star(3)).toHaveAttribute("aria-checked", "true");
    expect(star(3)).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(star(1)).toHaveAttribute("aria-checked", "true");
    expect(spy.mock.calls).toEqual([[3], [2], [1]]);
  });

  it("Enter on the checked star clears it once (no double fire)", async () => {
    const spy = vi.fn();
    render(<Controlled initial={5} spy={spy} />);
    star(5).focus();
    await userEvent.keyboard("{Enter}");
    expect(spy.mock.calls).toEqual([[null]]);
  });
});
