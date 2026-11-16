// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import type { Baby } from "@/types";
import MorePage from "./page";

const lua = { id: "b1", name: "Lua", birth_date: "2026-02-01", avatar_url: null } as Baby;
const theo = { id: "b2", name: "Theo", birth_date: "2024-05-01", avatar_url: null } as Baby;

afterEach(cleanup);

function hrefs() {
  return screen.getAllByRole("link").map((a) => a.getAttribute("href"));
}

describe("MorePage", () => {
  it("lists the three groups with real baby names in the subtitles", () => {
    renderWithProviders(<MorePage />, {
      baby: { activeBaby: lua, babies: [lua, theo] },
      profile: { isNannyMode: false },
    });
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Assistente",
      "Casa",
      "Conta",
    ]);
    expect(hrefs()).toEqual([
      "/more/ai/chat",
      "/more/ai",
      "/more/babies",
      "/more/family",
      "/more/notifications",
      "/more/reports",
      "/more/profile",
    ]);
    const chat = screen.getByRole("link", { name: /Pergunte à IA/ });
    expect(within(chat).getByText("Converse sobre o sono de Lua")).toBeInTheDocument();
    const babies = screen.getByRole("link", { name: /Bebês/ });
    expect(within(babies).getByText("Lua, Theo")).toBeInTheDocument();
  });

  it("shows notifications and the profile to the nanny", () => {
    renderWithProviders(<MorePage />, {
      baby: { activeBaby: lua, babies: [lua] },
      profile: { isNannyMode: true },
    });
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Conta"]);
    expect(hrefs()).toEqual(["/more/notifications", "/more/profile"]);
    expect(screen.getByRole("link", { name: /Notificações/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Perfil/ })).toBeInTheDocument();
  });

  it("shows a skeleton, not the items, while the profile loads", () => {
    renderWithProviders(<MorePage />, {
      baby: { activeBaby: lua, babies: [lua] },
      profile: { isLoading: true },
    });
    expect(screen.getByRole("status", { name: "Carregando" })).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("keeps the skeleton while the babies load, never a false empty subtitle", () => {
    renderWithProviders(<MorePage />, {
      baby: { activeBaby: null, babies: [], isLoading: true },
      profile: {},
    });
    expect(screen.getByRole("status", { name: "Carregando" })).toBeInTheDocument();
    expect(screen.queryByText("Adicione o primeiro bebê")).not.toBeInTheDocument();
  });

  it("falls back when there is no baby yet", () => {
    renderWithProviders(<MorePage />, { baby: { activeBaby: null, babies: [] }, profile: {} });
    expect(screen.getByText("Converse sobre o sono do bebê")).toBeInTheDocument();
    expect(screen.getByText("Adicione o primeiro bebê")).toBeInTheDocument();
  });
});
