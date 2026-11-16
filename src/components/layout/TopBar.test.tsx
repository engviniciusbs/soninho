// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import type { Baby } from "@/types";
import { TopBar } from "./TopBar";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/feeding",
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));

const lia = { id: "baby-1", name: "Lia", birth_date: "2025-06-01", avatar_url: null } as Baby;

afterEach(cleanup);

describe("TopBar", () => {
  it("não tem botão de sair (sair fica em Mais › Perfil)", () => {
    renderWithProviders(<TopBar />, { baby: { activeBaby: lia, babies: [lia] } });
    expect(screen.getByRole("combobox", { name: "Trocar de bebê" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sair/i })).not.toBeInTheDocument();
  });
});
