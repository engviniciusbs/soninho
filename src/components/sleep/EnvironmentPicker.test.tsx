// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  EnvironmentPicker,
  type EnvironmentData,
} from "./EnvironmentPicker";

// framer-motion swapped for plain elements (see src/test/motion.tsx).
vi.mock("framer-motion", () => import("@/test/motion"));

const EMPTY: EnvironmentData = {
  room_temp_celsius: null,
  weather_condition: null,
  sleep_sack_type: null,
  sleep_sack_tog: null,
  clothing_description: null,
};
const FILLED: EnvironmentData = {
  room_temp_celsius: 17,
  weather_condition: "cold",
  sleep_sack_type: "fleece",
  sleep_sack_tog: 2.5,
  clothing_description: null,
};

afterEach(() => {
  cleanup();
});

describe("EnvironmentPicker", () => {
  it("renders_environment_picker", () => {
    const { container, rerender } = render(
      <EnvironmentPicker value={EMPTY} onChange={() => {}} />
    );
    expect(screen.getByText("Temperatura do quarto")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Condição climática" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Tipo de saquinho" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "TOG do saquinho" })).not.toBeInTheDocument();
    expect(
      screen.getByText("Informe a temperatura do quarto para ver a sugestão de roupa")
    ).toBeInTheDocument();
    expect(container).toMatchSnapshot("empty");

    rerender(<EnvironmentPicker value={FILLED} onChange={() => {}} />);
    expect(screen.getByText("17.0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Frio" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: "TOG do saquinho" })).toBeInTheDocument();
    expect(screen.getByText("Sugestão de roupa")).toBeInTheDocument();
    expect(container).toMatchSnapshot("filled");

    rerender(<EnvironmentPicker value={FILLED} onChange={() => {}} compact />);
    expect(screen.queryByText("Sugestão de roupa")).not.toBeInTheDocument();
    expect(container).toMatchSnapshot("filled-compact-prop");
  });

  it("emits_changes_in_order", () => {
    const onChange = vi.fn();
    const { rerender } = render(<EnvironmentPicker value={EMPTY} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar temperatura" }));
    fireEvent.click(screen.getByRole("button", { name: "Definir temperatura como 26°C" }));
    fireEvent.click(screen.getByRole("button", { name: "Chuvoso" }));
    fireEvent.click(screen.getByRole("button", { name: /^Saquinho soft\/fleece/ }));
    rerender(<EnvironmentPicker value={FILLED} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "TOG 2.5" }));
    fireEvent.click(screen.getByRole("button", { name: "Frio" }));
    fireEvent.click(screen.getByRole("button", { name: "Diminuir temperatura" }));
    fireEvent.click(screen.getByRole("button", { name: "Limpar temperatura" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "TOG 1" }), { key: "Enter" });
    expect(onChange.mock.calls).toMatchSnapshot();
  });
});
