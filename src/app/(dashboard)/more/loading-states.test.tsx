// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import type { Baby } from "@/types";
import BabiesPage from "./babies/page";
import FamilyPage from "./family/page";

const holder = vi.hoisted(() => ({ getUser: null as unknown as () => Promise<unknown> }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getUser: () => holder.getUser() } }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }));
vi.mock("@/components/settings/FamilySettings", () => ({
  FamilySettings: () => <div data-testid="family" />,
}));
vi.mock("@/components/family/FamilyNoteCard", () => ({ FamilyNoteCard: () => null }));

const lua = { id: "b1", name: "Lua", birth_date: "2026-02-01", avatar_url: null } as Baby;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Mais › Bebês while the babies load", () => {
  it("shows a list-shaped skeleton, not the empty state", () => {
    renderWithProviders(<BabiesPage />, { baby: { babies: [], activeBaby: null, isLoading: true } });
    expect(screen.getByRole("status", { name: "Carregando bebês" })).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum bebê cadastrado/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Adicionar" })).not.toBeInTheDocument();
  });

  it("shows the empty state once loaded with no babies", () => {
    renderWithProviders(<BabiesPage />, { baby: { babies: [], activeBaby: null, isLoading: false } });
    expect(screen.getByText(/Nenhum bebê cadastrado/)).toBeInTheDocument();
  });
});

describe("Mais › Família without a resolvable user", () => {
  it.each([
    ["no user", () => Promise.resolve({ data: { user: null } })],
    ["getUser rejects", () => Promise.reject(new Error("offline"))],
  ])("leaves the skeleton for a message (%s)", async (_, getUser) => {
    holder.getUser = getUser;
    renderWithProviders(<FamilyPage />, { baby: { babies: [lua], activeBaby: lua } });
    expect(await screen.findByText(/Não foi possível carregar sua conta/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/Não foi possível carregar sua conta/);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByTestId("family")).not.toBeInTheDocument();
  });

  it("renders the family settings when the user resolves", async () => {
    holder.getUser = () => Promise.resolve({ data: { user: { id: "u1" } } });
    renderWithProviders(<FamilyPage />, { baby: { babies: [lua], activeBaby: lua } });
    expect(await screen.findByTestId("family")).toBeInTheDocument();
  });
});
