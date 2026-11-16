// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MoonOrbit } from "./MoonOrbit";
import { SunOrbit } from "./SunOrbit";

afterEach(cleanup);

describe.each([
  ["MoonOrbit", MoonOrbit],
  ["SunOrbit", SunOrbit],
])("%s", (_, Illustration) => {
  it("renders a decorative svg hidden from assistive tech", () => {
    const { container } = render(<Illustration />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("takes its size from the size prop, keeping the 140:120 ratio", () => {
    const { container } = render(<Illustration size={70} className="x" />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("width", "70");
    expect(svg).toHaveAttribute("height", "60");
    expect(svg).toHaveClass("x");
  });
});
