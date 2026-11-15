import { expect, it } from "vitest";

it("runs in America/Sao_Paulo (UTC-3)", () => {
  expect(new Date("2026-05-23T03:00:00Z").getHours()).toBe(0);
});
