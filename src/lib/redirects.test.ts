import { describe, expect, it } from "vitest";
import { legacyRedirects } from "@/lib/redirects";

const tab = (value: string) => [{ type: "query", key: "tab", value }];

describe("legacyRedirects", () => {
  const rules = legacyRedirects();

  it.each([
    ["notifications", "/more/notifications"],
    ["tools", "/more/reports"],
    ["general", "/more"],
  ])("/settings?tab=%s leva a %s", (value, destination) => {
    expect(rules).toContainEqual({
      source: "/settings",
      destination,
      permanent: false,
      has: tab(value),
    });
  });

  it("/settings sem query leva a /more", () => {
    expect(rules).toContainEqual({ source: "/settings", destination: "/more", permanent: false });
  });

  it("/ai-insights leva a /more/ai", () => {
    expect(rules).toContainEqual({ source: "/ai-insights", destination: "/more/ai", permanent: false });
  });

  it("todas são temporárias", () => {
    expect(rules.every((r) => r.permanent === false)).toBe(true);
  });

  it("as regras com query vêm antes da regra sem query", () => {
    const settings = rules.filter((r) => r.source === "/settings");
    const plain = settings.findIndex((r) => !r.has);
    expect(plain).toBe(settings.length - 1);
    expect(settings.slice(0, plain).every((r) => r.has)).toBe(true);
  });
});
