import { describe, expect, it } from "vitest";
import { formatDuration } from "./utils";

describe("formatDuration", () => {
  it.each([
    [0, "0 min"],
    [40, "40 min"],
    [59.6, "1h"],
    [90, "1h 30min"],
    [119.6, "2h"],
    [120, "2h"],
    [-5, "0 min"],
  ])("%s min → %s", (min, text) => {
    expect(formatDuration(min)).toBe(text);
  });
});
