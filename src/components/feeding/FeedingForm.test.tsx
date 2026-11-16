// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { renderWithProviders } from "@/test/render";
import { createRecordingSupabase, type RecordingSupabase } from "@/test/recordingSupabase";
import { settle, stable } from "@/test/dom";
import type { Baby, FeedingTimelineItem } from "@/types";
import { FeedingForm } from "./FeedingForm";

const holder = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => holder.client }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const NOW = new Date("2026-01-01T12:00:00.000Z"); // 09:00 in America/Sao_Paulo
const MSG = "O fim não pode ser antes do início";
const baby = { id: "baby-1", name: "Lia", birth_date: "2025-11-01" } as Baby;
const START = "2026-01-01T10:20:00.000Z"; // 07:20 local
const END = "2026-01-01T10:45:00.000Z"; // 07:45 local
const items: Record<string, FeedingTimelineItem> = {
  BOTTLE: {
    id: "b-1", type: "BOTTLE", startTime: START, endTime: null, summary: "90ml",
    raw: { id: "b-1", volume_ml: 90, milk_type: "BREAST_MILK", notes: "morna" },
  } as unknown as FeedingTimelineItem,
  BREAST: {
    id: "f-1", type: "BREAST", startTime: START, endTime: END, summary: "12min",
    raw: { id: "f-1", side_left_sec: 300, side_right_sec: 420, notes: "calma" },
  } as unknown as FeedingTimelineItem,
  SOLID: {
    id: "so-1", type: "SOLID", startTime: START, endTime: null, summary: "Banana",
    raw: { id: "so-1", food_tags: ["Banana", "Kiwi"], reaction: "LIKED", notes: "sujou" },
  } as unknown as FeedingTimelineItem,
};
let sb: RecordingSupabase;
let onClose: ReturnType<typeof vi.fn<() => void>>;

beforeEach(() => {
  // Only Date is faked: waitFor needs real timers.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  sb = createRecordingSupabase();
  sb.respond((c) => (c.ops.some(([m]) => m === "single") ? { data: { id: "new-1" }, error: null } : undefined));
  holder.client = sb.client;
  onClose = vi.fn();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null)));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function mount(item: FeedingTimelineItem | null = null) {
  const view = renderWithProviders(<FeedingForm open onClose={onClose} item={item} />, {
    baby: { activeBaby: baby, babies: [baby] },
  });
  await screen.findByRole("dialog");
  await settle();
  return view;
}

const field = (id: string) => document.getElementById(id) as HTMLInputElement;
const change = (id: string, value: string) => fireEvent.change(field(id), { target: { value } });
const pick = (label: string) => fireEvent.click(screen.getByRole("button", { name: label }));
const submit = () => fireEvent.click(screen.getByRole("button", { name: /^(Registrar|Atualizar)$/ }));
const ops = (table: string) => sb.find(table).map((c) => c.ops);

describe("FeedingForm", () => {
  it.each([
    ["BOTTLE", "Mamadeira"],
    ["BREAST", "Peito"],
    ["SOLID", "Sólidos"],
  ])("renders_create_%s", async (type, label) => {
    await mount();
    pick(label);
    expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
    expect(field("start_date").value).toBe("2026-01-01");
    expect(field("start_time_input").value).toBe("09:00");
    expect(stable(document.body)).toMatchSnapshot(`create ${type}`);
  });

  it.each(["BOTTLE", "BREAST", "SOLID"])("edit_prefills_all_fields %s", async (type) => {
    await mount(items[type]);
    expect(screen.getByText("Editar alimentação")).toBeInTheDocument();
    expect(field("start_date").value).toBe("2026-01-01");
    expect(field("start_time_input").value).toBe("07:20");
    if (type === "BOTTLE") {
      expect(field("volume_ml").value).toBe("90");
      expect(screen.getByLabelText("Tipo de leite")).toHaveTextContent("Leite materno");
      expect(field("notes").value).toBe("morna");
    } else if (type === "BREAST") {
      expect(field("end_date").value).toBe("2026-01-01");
      expect(field("end_time_input").value).toBe("07:45");
      expect(field("side_left_min").value).toBe("5");
      expect(field("side_right_min").value).toBe("7");
      expect(field("notes").value).toBe("calma");
    } else {
      expect(screen.getByRole("button", { name: "Remover Kiwi" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Banana" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByLabelText("Reação do bebê")).toHaveTextContent("Gostou");
      expect(field("notes").value).toBe("sujou");
    }
    expect(stable(document.body)).toMatchSnapshot(`edit ${type}`);
  });

  it("reopen_starts_from_fresh_values", async () => {
    const { rerender } = await mount();
    pick("Sólidos");
    pick("Banana");
    rerender(<FeedingForm open={false} onClose={onClose} item={null} />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    rerender(<FeedingForm open onClose={onClose} item={null} />);
    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Mamadeira" })).toHaveAttribute("aria-pressed", "true");
    rerender(<FeedingForm open={false} onClose={onClose} item={null} />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    rerender(<FeedingForm open onClose={onClose} item={items.SOLID} />);
    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Remover Kiwi" })).toBeInTheDocument();
    expect(field("notes").value).toBe("sujou");
  });

  it("create_submits_same_payload", async () => {
    await mount();
    change("start_time_input", "08:00");
    submit();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(ops("bottle_feedings")).toEqual([
      [
        ["insert", [{ baby_id: "baby-1", volume_ml: 120, milk_type: "FORMULA", start_time: "2026-01-01T11:00:00.000Z", notes: null }]],
        ["select", []],
        ["single", []],
      ],
    ]);

    cleanup();
    await mount();
    pick("Peito");
    change("start_time_input", "08:00");
    change("end_time_input", "08:30");
    change("side_left_min", "5");
    change("side_right_min", "10");
    change("notes", "ok");
    submit();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
    expect(ops("breastfeeding_sessions")).toEqual([
      [
        [
          "insert",
          [
            {
              baby_id: "baby-1",
              start_time: "2026-01-01T11:00:00.000Z",
              end_time: "2026-01-01T11:30:00.000Z",
              side_left_sec: 300,
              side_right_sec: 600,
              last_side: "RIGHT",
              notes: "ok",
            },
          ],
        ],
        ["select", []],
        ["single", []],
      ],
    ]);

    cleanup();
    await mount();
    pick("Sólidos");
    pick("Banana");
    submit();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(3));
    expect(ops("solid_feedings")).toEqual([
      [
        ["insert", [{ baby_id: "baby-1", food_tags: ["Banana"], reaction: null, start_time: NOW.toISOString(), notes: null }]],
        ["select", []],
        ["single", []],
      ],
    ]);
  });

  it("edit_breast_submits_update", async () => {
    await mount(items.BREAST);
    change("end_time_input", "07:50");
    submit();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(ops("breastfeeding_sessions")).toEqual([
      [
        ["update", [{ start_time: START, end_time: "2026-01-01T10:50:00.000Z", side_left_sec: 300, side_right_sec: 420, notes: "calma" }]],
        ["eq", ["id", "f-1"]],
        ["select", []],
        ["single", []],
      ],
    ]);
  });

  it("blocks_submit_when_end_before_start", async () => {
    await mount();
    pick("Peito");
    change("end_time_input", "08:00");
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(MSG);
    expect(field("end_time_input")).toHaveAttribute("aria-invalid", "true");
    expect(toast.error).toHaveBeenCalledWith(MSG);
    expect(sb.chains).toEqual([]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("maps_check_violation_to_range_message", async () => {
    sb.respond(() => ({ data: null, error: { code: "23514", message: "check" } }));
    await mount(items.BREAST);
    submit();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(MSG));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("post_submit_end_time_change_keeps_range_error_when_still_invalid", async () => {
    await mount();
    pick("Peito");
    change("end_time_input", "08:00");
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(MSG);
    change("end_time_input", "08:30");
    // Let the post-submit re-validation (async resolver) settle.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole("alert")).toHaveTextContent(MSG);
    expect(field("end_time_input")).toHaveAttribute("aria-invalid", "true");
  });

  it("post_submit_end_time_change_clears_range_error_when_valid", async () => {
    await mount();
    pick("Peito");
    change("end_time_input", "08:00");
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(MSG);
    change("end_time_input", "09:30");
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(field("end_time_input")).toHaveAttribute("aria-invalid", "false");
  });

  it("end_date_change_clears_or_sets_range_error", async () => {
    await mount();
    pick("Peito");
    change("end_date", "2025-12-31");
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(MSG);
    // Changing only the end DATE back to a valid range clears the error...
    change("end_date", "2026-01-02");
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(field("end_time_input")).toHaveAttribute("aria-invalid", "false");
    // ...and making it invalid again sets it, without submitting.
    change("end_date", "2025-12-30");
    expect(await screen.findByRole("alert")).toHaveTextContent(MSG);
  });

  it("save_and_delete_do_not_run_at_the_same_time", async () => {
    const pending = new Promise<boolean>(() => {});
    const onDelete = vi.fn(() => pending);
    renderWithProviders(
      <FeedingForm open onClose={onClose} item={items.BOTTLE} onDelete={onDelete} />,
      { baby: { activeBaby: baby, babies: [baby] } }
    );
    await screen.findByRole("dialog");
    await settle();

    // Deleting: "Atualizar" waits.
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeDisabled();
  });

  it("excluir_waits_while_the_update_is_saving", async () => {
    // The update never answers, so the form stays submitting.
    sb.respond(() => new Promise(() => {}) as never);
    renderWithProviders(
      <FeedingForm open onClose={onClose} item={items.BOTTLE} onDelete={vi.fn(async () => true)} />,
      { baby: { activeBaby: baby, babies: [baby] } }
    );
    await screen.findByRole("dialog");
    await settle();

    submit();
    await waitFor(() => expect(screen.getByRole("button", { name: "Excluir" })).toBeDisabled());
  });

  it("a_custom_food_tag_is_removed_by_its_own_close_button", async () => {
    await mount(items.SOLID);
    fireEvent.click(screen.getByRole("button", { name: "Remover Kiwi" }));
    expect(screen.queryByRole("button", { name: "Remover Kiwi" })).toBeNull();
    expect(screen.queryByText("Kiwi")).toBeNull();
    // Banana stays picked.
    expect(screen.getByRole("button", { name: "Banana" })).toHaveAttribute("aria-pressed", "true");
  });
});
