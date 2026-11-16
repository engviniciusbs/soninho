// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { TempStepper } from "./TempStepper";
import { TogSelector } from "./TogSelector";
import { SackTypeSelector } from "./SackTypeSelector";
import { WeatherSelector } from "./WeatherSelector";

afterEach(cleanup);

// Spec #22: a native button already turns Enter and Space into one click;
// an extra onKeyDown made each key press act twice.
describe("environment controls fire once per key press", () => {
  it("Enter on 'Aumentar temperatura' adds 0,5 once", async () => {
    const onChange = vi.fn();
    render(<TempStepper value={22} onChange={onChange} />);
    screen.getByRole("button", { name: "Aumentar temperatura" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(22.5);
  });

  it("Space on 'Diminuir temperatura' subtracts 0,5 once", async () => {
    const onChange = vi.fn();
    render(<TempStepper value={22} onChange={onChange} />);
    screen.getByRole("button", { name: "Diminuir temperatura" }).focus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(21.5);
  });

  it("Enter on a temperature preset and on 'Limpar' fires once", async () => {
    const onChange = vi.fn();
    render(<TempStepper value={22} onChange={onChange} />);
    screen.getByRole("button", { name: "Definir temperatura como 24°C" }).focus();
    await userEvent.keyboard("{Enter}");
    screen.getByRole("button", { name: "Limpar temperatura" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onChange.mock.calls).toEqual([[24], [null]]);
  });

  it("Enter on TOG, sack and weather tiles fires once", async () => {
    const onTog = vi.fn();
    const onSack = vi.fn();
    const onWeather = vi.fn();
    render(
      <>
        <TogSelector sackType="fleece" value={null} onSelect={onTog} />
        <SackTypeSelector value={null} onSelect={onSack} />
        <WeatherSelector value={null} onSelect={onWeather} />
      </>
    );
    screen.getByRole("button", { name: "TOG 1" }).focus();
    await userEvent.keyboard("{Enter}");
    screen.getByRole("button", { name: /^Saquinho de malha/ }).focus();
    await userEvent.keyboard("{Enter}");
    screen.getByRole("button", { name: "Frio" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onTog).toHaveBeenCalledTimes(1);
    expect(onSack).toHaveBeenCalledTimes(1);
    expect(onWeather).toHaveBeenCalledTimes(1);
  });
});
