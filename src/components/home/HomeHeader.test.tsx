// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { HomeTopBar } from "./HomeHeader";

afterEach(cleanup);

describe("HomeTopBar", () => {
  it("shows the brand only on mobile: the desktop sidebar already carries it", () => {
    render(<HomeTopBar />);
    const brand = screen.getByText("Soninho");
    expect(brand).toHaveClass("md:hidden");
  });
});
