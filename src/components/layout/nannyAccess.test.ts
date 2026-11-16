import { describe, expect, it } from "vitest";
import { isNannyAllowed } from "@/components/layout/nannyAccess";

describe("isNannyAllowed", () => {
  it.each(["/app", "/more", "/more/profile"])("permite %s", (path) => {
    expect(isNannyAllowed(path)).toBe(true);
  });

  it.each([
    "/more/family",
    "/more/ai",
    "/more/ai/chat",
    "/more/babies",
    "/history",
    "/analytics/naps",
    "/feeding",
    "/more/profile/../family",
  ])("bloqueia %s", (path) => {
    expect(isNannyAllowed(path)).toBe(false);
  });
});
