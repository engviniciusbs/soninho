// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SegmentedControl } from "./segmented-control";

type Kind = "NAP" | "NIGHT_SLEEP";
const options: { value: Kind; label: string }[] = [
  { value: "NAP", label: "Soneca" },
  { value: "NIGHT_SLEEP", label: "Noturno" },
];

afterEach(cleanup);

describe("SegmentedControl", () => {
  it("calls onChange with the clicked option", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl value="NAP" onChange={onChange} options={options} aria-label="Tipo de sono" />
    );
    fireEvent.click(screen.getByRole("radio", { name: "Noturno" }));
    expect(onChange).toHaveBeenCalledWith("NIGHT_SLEEP");
  });

  it("moves the selection to the next option with ArrowRight", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl value="NAP" onChange={onChange} options={options} aria-label="Tipo de sono" />
    );
    fireEvent.keyDown(screen.getByRole("radio", { name: "Soneca" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("NIGHT_SLEEP");
  });

  it("marks the active option with aria-checked", () => {
    render(
      <SegmentedControl value="NIGHT_SLEEP" onChange={() => {}} options={options} aria-label="Tipo de sono" />
    );
    expect(screen.getByRole("radiogroup", { name: "Tipo de sono" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Noturno" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Soneca" })).toHaveAttribute("aria-checked", "false");
  });
});
