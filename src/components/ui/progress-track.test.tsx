// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProgressTrack } from "./progress-track";

afterEach(cleanup);

describe("ProgressTrack", () => {
  it.each([
    [1.4, "100"],
    [-1, "0"],
    [0.72, "72"],
  ])("value %s gives aria-valuenow %s", (value, now) => {
    render(<ProgressTrack value={value} label="Janela de vigília" />);
    expect(screen.getByRole("progressbar", { name: "Janela de vigília" })).toHaveAttribute(
      "aria-valuenow",
      now
    );
  });
});
