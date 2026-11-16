// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TempStepper } from "@/components/sleep/environment/TempStepper";
import { TogSelector } from "@/components/sleep/environment/TogSelector";

afterEach(cleanup);

describe("environment decimals in pt-BR", () => {
  it("temperature reads 22,5, never 22.5", () => {
    render(<TempStepper value={22.5} onChange={() => {}} />);
    expect(screen.getByText("22,5")).toBeInTheDocument();
    expect(screen.queryByText("22.5")).not.toBeInTheDocument();
  });

  it("TOG options read 0,5 and 2,5 (visible and accessible name)", () => {
    render(<TogSelector sackType="flannel" value={null} onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: "TOG 2,5" })).toHaveTextContent("2,5");
    expect(screen.getByRole("button", { name: "TOG 0,5" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d\.\d/);
  });
});

describe("wake window bounds use the single duration format", () => {
  it("reads 1h 15min, never 1h15", async () => {
    const { WakeWindowCard } = await import("@/components/home/WakeWindowCard");
    render(
      <WakeWindowCard
        elapsedMinutes={30}
        status="green"
        range={{ minMinutes: 60, maxMinutes: 75 } as never}
        hasLastSleep
        isLoading={false}
      />
    );
    expect(screen.getByText("Janela de vigília: 1h a 1h 15min")).toBeInTheDocument();
  });
});
