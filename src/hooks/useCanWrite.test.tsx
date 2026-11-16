// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@/test/render";
import { getUserRoleForBaby } from "@/lib/supabase/queries/family";
import type { Baby } from "@/types";
import { useCanWrite } from "./useCanWrite";

const holder = vi.hoisted(() => ({
  role: null as "owner" | "caregiver" | "viewer" | null,
  userId: "user-1" as string | null,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({
        data: { session: holder.userId ? { user: { id: holder.userId } } : null },
      }),
    },
  }),
}));
vi.mock("@/lib/supabase/queries/family", () => ({
  getUserRoleForBaby: vi.fn(async () => holder.role),
}));

const lia = { id: "baby-1", name: "Lia", birth_date: "2025-06-01" } as Baby;

beforeEach(() => {
  holder.role = null;
  holder.userId = "user-1";
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function run() {
  return renderHookWithProviders(() => useCanWrite(), {
    baby: { activeBaby: lia, babies: [lia] },
  });
}

describe("useCanWrite", () => {
  it.each(["owner", "caregiver"] as const)("%s pode registrar", async (role) => {
    holder.role = role;
    const { result } = run();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canWrite).toBe(true);
    expect(getUserRoleForBaby).toHaveBeenCalledWith(expect.anything(), "user-1", "baby-1");
  });

  it("viewer só vê", async () => {
    holder.role = "viewer";
    const { result } = run();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canWrite).toBe(false);
  });

  it("sem papel na família não registra", async () => {
    holder.role = null;
    const { result } = run();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canWrite).toBe(false);
  });

  it("enquanto carrega não libera a escrita", () => {
    holder.role = "owner";
    const { result } = run();
    expect(result.current).toEqual({ canWrite: false, isLoading: true });
  });

  it("sem sessão não registra", async () => {
    holder.userId = null;
    holder.role = "owner";
    const { result } = run();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canWrite).toBe(false);
    expect(getUserRoleForBaby).not.toHaveBeenCalled();
  });
});
