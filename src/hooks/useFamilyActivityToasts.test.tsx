// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { toast } from "sonner";
import { BabyContext, type BabyContextValue } from "@/components/providers/BabyProvider";
import type { Baby } from "@/types";
import { useFamilyActivityToasts } from "./useFamilyActivityToasts";

vi.mock("sonner", () => ({ toast: { info: vi.fn() } }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "me" } } }) },
  }),
}));

type Item = Record<string, unknown>;
/** Latest activity item served per baby id. */
let latest: Record<string, Item> = {};

const babyA = { id: "baby-a", name: "Lia" } as Baby;
const babyB = { id: "baby-b", name: "Teo" } as Baby;

function item(id: string, over: Item = {}): Item {
  return {
    id,
    kind: "sleep",
    action: "started",
    created_at: "2026-11-16T10:00:00Z",
    actor_user_id: "other",
    actor_name: "Bia",
    actor_relation: null,
    sleep_type: "NAP",
    ...over,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  latest = {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const babyId = new URL(url, "http://x").searchParams.get("babyId")!;
      return { ok: true, json: async () => ({ data: latest[babyId] ? [latest[babyId]] : [] }) };
    })
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function nextPoll() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(25_000);
  });
}

let active: Baby = babyA;

function Wrapper({ children }: { children: ReactNode }) {
  const value: BabyContextValue = {
    babies: [babyA, babyB],
    activeBaby: active,
    setActiveBaby: () => {},
    isLoading: false,
  };
  return <BabyContext.Provider value={value}>{children}</BabyContext.Provider>;
}

function setup() {
  active = babyA;
  return renderHook(() => useFamilyActivityToasts(true), { wrapper: Wrapper });
}

describe("useFamilyActivityToasts", () => {
  it("shows another caregiver's new sleep", async () => {
    latest[babyA.id] = item("s1");
    setup();
    await act(async () => {});
    latest[babyA.id] = item("s2");
    await nextPoll();
    expect(toast.info).toHaveBeenCalledWith("Bia iniciou soneca de Lia");
  });

  it("ignores my own actions", async () => {
    latest[babyA.id] = item("s1");
    setup();
    await act(async () => {});
    latest[babyA.id] = item("s2", { actor_user_id: "me" });
    await nextPoll();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("describes a feeding with the feeding text, never as a nap", async () => {
    latest[babyA.id] = item("s1");
    setup();
    await act(async () => {});
    latest[babyA.id] = item("f1", {
      kind: "feeding",
      action: "logged",
      sleep_type: undefined,
      feeding_type: "BOTTLE",
    });
    await nextPoll();
    expect(toast.info).toHaveBeenCalledWith("Bia registrou mamadeira de Lia");
  });

  it("does not toast the other baby's old activity after switching babies", async () => {
    latest[babyA.id] = item("s1");
    latest[babyB.id] = item("old-b", { created_at: "2026-11-15T08:00:00Z" });
    const { rerender } = setup();
    await act(async () => {});
    active = babyB;
    rerender();
    await act(async () => {});
    await nextPoll();
    expect(toast.info).not.toHaveBeenCalled();

    latest[babyB.id] = item("new-b");
    await nextPoll();
    expect(toast.info).toHaveBeenCalledWith("Bia iniciou soneca de Teo");
  });
});
