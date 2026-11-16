// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { useSleepStore } from "@/store/sleepStore";
import { useFeedingStore } from "@/store/feedingStore";
import { regressionAiKey } from "@/lib/sleep/regressionAiGate";
import { SignOutButton, signOutEverywhere } from "./SignOutButton";

const holder = vi.hoisted(() => ({
  signOut: vi.fn(async () => ({ error: null })),
  push: vi.fn(),
  calls: [] as string[],
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: holder.signOut } }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: holder.push, refresh: () => {} }),
}));

const ENDPOINT = "https://push.example/abc";
let unsubscribe: ReturnType<typeof vi.fn>;
let fetchMock: ReturnType<typeof vi.fn>;

function installPush(subscription: unknown) {
  Object.defineProperty(window, "PushManager", { value: function PushManager() {}, configurable: true });
  Object.defineProperty(window, "Notification", { value: function Notification() {}, configurable: true });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: async () => ({ pushManager: { getSubscription: async () => subscription } }),
      // Never resolves without a registered worker: sign-out must not wait on it.
      ready: new Promise(() => {}),
    },
  });
}

function seedDevice() {
  useSleepStore.setState({
    activeBabyId: "baby-1",
    timers: {
      "baby-1": {
        sessionId: "s1",
        startTime: "2026-01-01T12:00:00.000Z",
        sleepType: "NAP",
        notes: "",
        roomTemp: null,
        weatherCondition: null,
        sleepSackType: null,
        sleepSackTog: null,
      },
    },
  });
  useFeedingStore.setState({
    timers: {
      "baby-1": {
        sessionId: "f1",
        startTime: "2026-01-01T12:00:00.000Z",
        activeSide: "LEFT",
        sideLeftSec: 0,
        sideRightSec: 0,
        sideStartedAt: "2026-01-01T12:00:00.000Z",
      },
    },
  });
  localStorage.setItem(regressionAiKey("baby-1"), "1");
  localStorage.setItem("outra-chave", "fica");
}

beforeEach(() => {
  holder.calls = [];
  unsubscribe = vi.fn(async () => {
    holder.calls.push("unsubscribe");
    return true;
  });
  fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    holder.calls.push(`fetch ${init?.method}`);
    return new Response("{}", { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  holder.signOut.mockImplementation(async () => {
    holder.calls.push("signOut");
    return { error: null };
  });
  installPush({ endpoint: ENDPOINT, unsubscribe });
  seedDevice();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  localStorage.clear();
});

describe("signOutEverywhere", () => {
  it("cancela o push deste dispositivo antes de encerrar a sessão", async () => {
    await signOutEverywhere();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notifications/subscribe",
      expect.objectContaining({ method: "DELETE", body: JSON.stringify({ endpoint: ENDPOINT }) })
    );
    expect(unsubscribe).toHaveBeenCalled();
    // The DELETE needs the session, so it goes first.
    expect(holder.calls).toEqual(["fetch DELETE", "unsubscribe", "signOut"]);
  });

  it("limpa os timers locais e o gate de regressão", async () => {
    await signOutEverywhere();
    expect(localStorage.getItem("soninho-timer")).toBeNull();
    expect(localStorage.getItem("soninho-feeding-timer")).toBeNull();
    expect(localStorage.getItem(regressionAiKey("baby-1"))).toBeNull();
    expect(localStorage.getItem("outra-chave")).toBe("fica");
    expect(useSleepStore.getState().timers).toEqual({});
    expect(useSleepStore.getState().activeBabyId).toBeNull();
    expect(useFeedingStore.getState().timers).toEqual({});
  });

  it("sem inscrição de push só limpa e sai", async () => {
    installPush(null);
    await signOutEverywhere();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(holder.signOut).toHaveBeenCalled();
    expect(localStorage.getItem("soninho-timer")).toBeNull();
  });

  it("falha no push não impede a saída", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await signOutEverywhere();
    expect(holder.signOut).toHaveBeenCalled();
    expect(localStorage.getItem("soninho-feeding-timer")).toBeNull();
  });
});

describe("SignOutButton", () => {
  it("sai limpando o dispositivo e vai para o login", async () => {
    renderWithProviders(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Sair da conta" }));
    await waitFor(() => expect(holder.push).toHaveBeenCalledWith("/login"));
    expect(unsubscribe).toHaveBeenCalled();
    expect(holder.signOut).toHaveBeenCalled();
    expect(localStorage.getItem("soninho-timer")).toBeNull();
  });
});
