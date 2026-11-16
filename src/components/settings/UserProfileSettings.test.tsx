// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { UserProfileContext } from "@/components/providers/UserProfileProvider";
import type { UserProfile } from "@/types";
import { UserProfileSettings } from "./UserProfileSettings";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const profile = (over: Partial<UserProfile> = {}) =>
  ({ display_name: "Ana", family_relation: "mae", ui_mode: "standard", ...over }) as UserProfile;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("UserProfileSettings", () => {
  it("fills the form from the profile and re-syncs when the profile changes", () => {
    const ctx = (p: UserProfile) => ({
      profile: p,
      isLoading: false,
      isNannyMode: false,
      refreshProfile: async () => {},
    });
    const ui = (p: UserProfile) => (
      <UserProfileContext.Provider value={ctx(p)}>
        <UserProfileSettings />
      </UserProfileContext.Provider>
    );
    const { rerender } = render(ui(profile()));
    const input = screen.getByLabelText("Nome para exibir") as HTMLInputElement;
    expect(input.value).toBe("Ana");
    fireEvent.change(input, { target: { value: "Edit" } });
    expect(input.value).toBe("Edit");
    // a new profile object (e.g. after refreshProfile) overwrites local edits
    rerender(ui(profile({ display_name: "Carla" })));
    expect(input.value).toBe("Carla");
  });

  it("saves trimmed values and refreshes the profile", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const refreshProfile = vi.fn(async () => {});
    renderWithProviders(<UserProfileSettings />, {
      profile: { profile: profile(), refreshProfile },
    });
    fireEvent.change(screen.getByLabelText("Nome para exibir"), {
      target: { value: "  Bia  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));
    await waitFor(() => expect(refreshProfile).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/profile");
    expect(JSON.parse(init.body as string)).toEqual({
      display_name: "Bia",
      family_relation: "mae",
      ui_mode: "standard",
      syncFamilyMembers: true,
    });
  });
});
