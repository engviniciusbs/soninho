import { describe, expect, it } from "vitest";
import { ALL_NAV_LINKS, getNavLinks } from "@/components/layout/navLinks";

describe("getNavLinks", () => {
  it("lista as 5 abas na ordem do menu", () => {
    expect(getNavLinks(false).map((l) => l.href)).toEqual([
      "/app",
      "/feeding",
      "/history",
      "/analytics",
      "/more",
    ]);
  });

  it("usa os rótulos curtos das abas", () => {
    expect(getNavLinks(false).map((l) => l.label)).toEqual([
      "Início",
      "Comida",
      "Registro",
      "Análise",
      "Mais",
    ]);
  });

  it("no modo babá mostra Início, Comida e Mais", () => {
    expect(getNavLinks(true).map((l) => l.href)).toEqual(["/app", "/feeding", "/more"]);
  });

  it("exporta as 5 abas com ícone", () => {
    expect(ALL_NAV_LINKS).toHaveLength(5);
    for (const link of ALL_NAV_LINKS) expect(link.icon).toBeTypeOf("function");
  });
});
