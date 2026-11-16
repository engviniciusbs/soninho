// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";

const { unsubscribe, getSession, onAuthStateChange, createClient } = vi.hoisted(() => {
  const unsubscribe = vi.fn();
  const getSession = vi.fn(async () => ({ data: { session: { user: { id: "u1" } } } }));
  const onAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe } } }));
  const client = { auth: { getSession, onAuthStateChange } };
  return { unsubscribe, getSession, onAuthStateChange, createClient: vi.fn(() => client) };
});
vi.mock("@/lib/supabase/client", () => ({ createClient }));
vi.mock("@/lib/supabase/queries/babies", () => ({
  getBabies: vi.fn(async () => ({ data: [{ id: "b1", name: "Lia" }], error: null })),
}));

import { BabyProvider, useBaby } from "./BabyProvider";

function Probe() {
  const { activeBaby, isLoading } = useBaby();
  return <p>{isLoading ? "loading" : (activeBaby?.name ?? "none")}</p>;
}

afterEach(cleanup);

describe("BabyProvider", () => {
  it("waits for the session, loads babies, picks the first and subscribes once", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender, unmount } = render(
      <QueryClientProvider client={qc}>
        <BabyProvider><Probe /></BabyProvider>
      </QueryClientProvider>
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Lia")).toBeInTheDocument());
    rerender(
      <QueryClientProvider client={qc}>
        <BabyProvider><Probe /></BabyProvider>
      </QueryClientProvider>
    );
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(onAuthStateChange).toHaveBeenCalledTimes(1);
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalled();
  });
});
