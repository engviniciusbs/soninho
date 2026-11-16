// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { renderWithProviders } from "@/test/render";
import { AIInsights } from "./AIInsights";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** A client with TanStack's own defaults (3 retries), so the component decides. */
const defaultClient = () => new QueryClient();

describe("AIInsights", () => {
  it("shows the daily limit message on 429, without retrying", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ error: "x" }, { status: 429 })
    );
    vi.stubGlobal("fetch", fetchMock);
    renderWithProviders(<AIInsights babyId="baby-1" />, { queryClient: defaultClient() });

    expect(await screen.findByText(/Limite diário de IA atingido/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry other AI errors either", async () => {
    const fetchMock = vi.fn(async () => new Response("boom", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    renderWithProviders(<AIInsights babyId="baby-1" />, { queryClient: defaultClient() });

    expect(await screen.findByText(/Não foi possível gerar esta análise/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
