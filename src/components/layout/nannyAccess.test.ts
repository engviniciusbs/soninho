import { describe, expect, it } from "vitest";
import { isNannyAllowed } from "@/components/layout/nannyAccess";

describe("isNannyAllowed", () => {
  it.each(["/app", "/feeding", "/more", "/more/notifications", "/more/profile"])("permite %s", (path) => {
    expect(isNannyAllowed(path)).toBe(true);
  });

  it.each([
    "/history",
    "/analytics",
    "/analytics/naps",
    "/more/family",
    "/more/ai",
    "/more/ai/chat",
    "/more/babies",
    "/more/reports",
    "/feeding/extra",
    "/more/notifications/../family",
    "/more/profile/../family",
  ])("bloqueia %s", (path) => {
    expect(isNannyAllowed(path)).toBe(false);
  });
});
