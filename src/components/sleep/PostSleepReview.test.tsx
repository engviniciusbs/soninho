// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { renderWithProviders } from "@/test/render";
import type { Baby } from "@/types";
import { PostSleepReview } from "@/components/sleep/PostSleepReview";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/supabase/queries/sleep", () => ({
  updateSleepSession: vi.fn(async () => ({ data: null, error: null })),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const baby = { id: "baby-1", name: "Lia", birth_date: "2026-06-01" } as Baby;

afterEach(() => {
  cleanup();
});

describe("PostSleepReview", () => {
  it("saving_refreshes_every_sleep_query_of_the_baby", async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    renderWithProviders(
      <PostSleepReview sessionId="s-1" sleepType="NAP" open onClose={() => {}} />,
      { baby: { activeBaby: baby, babies: [baby] }, queryClient }
    );

    fireEvent.click(screen.getByRole("radio", { name: "4 de 5 estrelas" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const keys = spy.mock.calls.map(([filters]) => filters?.queryKey);
    // The quality feeds the suggestion and the regression too.
    expect(keys).toEqual(
      expect.arrayContaining([
        ["sleep-sessions"],
        ["last-session", baby.id],
        ["last-session-key", baby.id],
        ["ai-suggestion", baby.id],
        ["regression", baby.id],
      ])
    );
  });
});
