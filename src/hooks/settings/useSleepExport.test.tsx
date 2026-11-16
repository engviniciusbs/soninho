// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { toast } from "sonner";
import { renderHookWithProviders } from "@/test/render";
import { createRecordingSupabase, type Chain, type RecordingSupabase } from "@/test/recordingSupabase";
import type { Baby } from "@/types";
import { useSleepExport } from "./useSleepExport";

const holder = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => holder.client }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const baby = { id: "baby-1", name: "Lia" } as Baby;
let sb: RecordingSupabase;
let blobs: Blob[];

function session(i: number) {
  return {
    id: `s-${i}`,
    type: "NAP",
    start_time: `2026-01-01T10:00:00.000Z`,
    end_time: null,
    duration_min: i,
    quality: null,
    location: null,
    notes: null,
  };
}

/** Serves `total` rows honouring `.range(from, to)`; `failPage` (0-based) errors. */
function paginated(total: number, failPage?: number) {
  return (c: Chain) => {
    if (c.target !== "sleep_sessions") return undefined;
    const range = c.ops.find(([m]) => m === "range");
    const [from, to] = (range?.[1] as [number, number] | undefined) ?? [0, 999];
    // Without .range() PostgREST caps the answer at 1000 rows.
    const end = Math.min(range ? to : 999, total - 1);
    if (failPage !== undefined && from === failPage * 1000) {
      return { data: null, error: { message: "boom" } };
    }
    const rows = [];
    for (let i = from; i <= end; i++) rows.push(session(i));
    return { data: rows, error: null };
  };
}

beforeEach(() => {
  sb = createRecordingSupabase();
  holder.client = sb.client;
  blobs = [];
  URL.createObjectURL = vi.fn((b: Blob) => {
    blobs.push(b);
    return "blob:x";
  }) as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function setup() {
  return renderHookWithProviders(() => useSleepExport(), {
    baby: { activeBaby: baby, babies: [baby] },
  });
}

describe("useSleepExport", () => {
  it("exports_every_row_past_the_1000_row_cap", async () => {
    sb.respond(paginated(2350));
    const { result } = setup();
    await act(() => result.current.exportCsv());

    expect(blobs).toHaveLength(1);
    const lines = (await blobs[0].text()).trim().split(/\r?\n/);
    expect(lines).toHaveLength(1 + 2350);
    expect(toast.success).toHaveBeenCalledWith("Dados exportados com sucesso");
    expect(result.current.exporting).toBe(false);
  });

  it("error_on_page_two_reports_failure_not_empty", async () => {
    sb.respond(paginated(2350, 1));
    const { result } = setup();
    await act(() => result.current.exportCsv());

    expect(toast.error).toHaveBeenCalledWith("Não foi possível exportar");
    expect(toast.info).not.toHaveBeenCalled();
    expect(blobs).toHaveLength(0);
    expect(result.current.exporting).toBe(false);
  });

  it("error_on_first_page_reports_failure_not_empty", async () => {
    sb.respond(paginated(10, 0));
    const { result } = setup();
    await act(() => result.current.exportCsv());

    expect(toast.error).toHaveBeenCalledWith("Não foi possível exportar");
    expect(toast.info).not.toHaveBeenCalled();
    expect(result.current.exporting).toBe(false);
  });

  it("no_rows_says_nothing_to_export", async () => {
    sb.respond(paginated(0));
    const { result } = setup();
    await act(() => result.current.exportCsv());

    expect(toast.info).toHaveBeenCalledWith("Nenhum registro para exportar");
    expect(result.current.exporting).toBe(false);
  });

  it("resets_loading_state_when_download_throws", async () => {
    sb.respond(paginated(3));
    URL.createObjectURL = vi.fn(() => {
      throw new Error("no blob");
    }) as typeof URL.createObjectURL;
    const { result } = setup();
    await act(() => result.current.exportCsv());

    expect(toast.error).toHaveBeenCalledWith("Não foi possível exportar");
    expect(result.current.exporting).toBe(false);
  });
});
