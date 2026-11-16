// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { renderWithProviders } from "@/test/render";
import { createRecordingSupabase, type RecordingSupabase } from "@/test/recordingSupabase";
import { settle, stable } from "@/test/dom";
import type { Baby, SleepSession } from "@/types";
import { SleepForm } from "./SleepForm";

const holder = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => holder.client }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
const invalidate = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/query/invalidateSleep", () => ({ invalidateSleepQueries: invalidate }));

const NOW = new Date("2026-01-01T12:00:00.000Z"); // 09:00 in America/Sao_Paulo
const MSG = "O fim não pode ser antes do início";
const baby = { id: "baby-1", name: "Lia", birth_date: "2025-11-01" } as Baby;
const session = {
  id: "s-1",
  baby_id: "baby-1",
  type: "NIGHT_SLEEP",
  start_time: "2025-12-31T23:30:00.000Z", // 20:30 local
  end_time: "2026-01-01T09:15:00.000Z", // 06:15 local
  quality: 4,
  how_fell_asleep: "colo",
  wake_reason: "fome",
  notes: "acordou uma vez",
  location: "berço",
  room_temp_celsius: 22,
  weather_condition: null,
  sleep_sack_type: null,
  sleep_sack_tog: null,
  clothing_description: null,
} as unknown as SleepSession;
let sb: RecordingSupabase;
let onClose: ReturnType<typeof vi.fn<() => void>>;

beforeEach(() => {
  // Only Date is faked: waitFor needs real timers.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  sb = createRecordingSupabase();
  holder.client = sb.client;
  onClose = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

async function mount(s: SleepSession | null = null) {
  const view = renderWithProviders(<SleepForm open onClose={onClose} session={s} />, {
    baby: { activeBaby: baby, babies: [baby] },
  });
  await screen.findByRole("dialog");
  await settle();
  return view;
}

const field = (id: string) => document.getElementById(id) as HTMLInputElement;
const change = (id: string, value: string) => fireEvent.change(field(id), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: /Registrar|Atualizar/ }));

describe("SleepForm", () => {
  it("renders_create", async () => {
    await mount();
    expect(field("start_date").value).toBe("2026-01-01");
    expect(field("start_time_input").value).toBe("09:00");
    expect(field("end_date").value).toBe("2026-01-01");
    expect(field("end_time_input").value).toBe("09:00");
    expect(stable(document.body)).toMatchSnapshot("create");
  });

  it("edit_prefills_all_fields", async () => {
    await mount(session);
    expect(screen.getByText("Editar sono")).toBeInTheDocument();
    expect(field("start_date").value).toBe("2025-12-31");
    expect(field("start_time_input").value).toBe("20:30");
    expect(field("end_date").value).toBe("2026-01-01");
    expect(field("end_time_input").value).toBe("06:15");
    expect(field("notes").value).toBe("acordou uma vez");
    // Closed selects show the label of the value (`items` mapping).
    expect(
      within(screen.getByLabelText("Tipo de sono")).getByRole("radio", { name: "Noturno" })
    ).toHaveAttribute("aria-checked", "true");
    expect(
      within(screen.getByRole("radiogroup", { name: "Qualidade do sono" })).getByRole("radio", {
        name: "4 de 5 estrelas",
      })
    ).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Como adormeceu")).toHaveTextContent("No colo");
    expect(screen.getByLabelText("Motivo do despertar")).toHaveTextContent("Fome");
    expect(screen.getByText("1 preenchido")).toBeInTheDocument();
    expect(stable(document.body)).toMatchSnapshot("edit");
  });

  it("reopen_starts_from_fresh_values", async () => {
    const { rerender } = await mount();
    change("notes", "rascunho");
    fireEvent.click(screen.getByRole("button", { name: "Condições do ambiente" }));
    rerender(<SleepForm open={false} onClose={onClose} session={null} />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    vi.setSystemTime(new Date("2026-01-01T13:30:00.000Z"));
    rerender(<SleepForm open onClose={onClose} session={null} />);
    await screen.findByRole("dialog");
    expect(field("notes").value).toBe("");
    expect(field("start_time_input").value).toBe("10:30");
    expect(screen.getByRole("button", { name: "Condições do ambiente" })).toHaveAttribute("aria-expanded", "false");
    rerender(<SleepForm open={false} onClose={onClose} session={null} />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    rerender(<SleepForm open onClose={onClose} session={session} />);
    await screen.findByRole("dialog");
    expect(field("notes").value).toBe("acordou uma vez");
  });

  it("create_submits_same_payload", async () => {
    await mount();
    change("start_time_input", "07:10");
    change("end_time_input", "08:40");
    submit();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sb.chains).toEqual([
      {
        target: "sleep_sessions",
        ops: [
          [
            "insert",
            [
              {
                type: "NAP",
                start_time: "2026-01-01T10:10:00.000Z",
                end_time: "2026-01-01T11:40:00.000Z",
                quality: null,
                how_fell_asleep: null,
                wake_reason: null,
                notes: null,
                room_temp_celsius: null,
                weather_condition: null,
                sleep_sack_type: null,
                sleep_sack_tog: null,
                clothing_description: null,
                baby_id: "baby-1",
              },
            ],
          ],
        ],
      },
    ]);
    expect(toast.success).toHaveBeenCalledWith("Sono registrado manualmente");
  });

  it("edit_submits_update", async () => {
    await mount(session);
    change("notes", "");
    submit();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sb.chains).toHaveLength(1);
    expect(sb.chains[0].target).toBe("sleep_sessions");
    expect(sb.chains[0].ops[0]).toEqual([
      "update",
      [
        expect.objectContaining({
          type: "NIGHT_SLEEP",
          start_time: "2025-12-31T23:30:00.000Z",
          end_time: "2026-01-01T09:15:00.000Z",
          quality: 4,
          how_fell_asleep: "colo",
          wake_reason: "fome",
          notes: null,
          room_temp_celsius: 22,
        }),
      ],
    ]);
    // The free "Local" field left the form: an edit keeps the stored column.
    expect(sb.chains[0].ops[0][1][0]).not.toHaveProperty("location");
    expect(sb.chains[0].ops[1]).toEqual(["eq", ["id", "s-1"]]);
  });

  it("blocks_submit_when_end_before_start", async () => {
    await mount();
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
    await mount();
    submit();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(MSG));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("post_submit_end_time_change_keeps_range_error_when_still_invalid", async () => {
    await mount();
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

  describe("redesign leftovers and keyboard (spec #21, #22)", () => {
    it("Enter on 'Condições do ambiente' opens the section once", async () => {
      await mount();
      const toggle = screen.getByRole("button", { name: "Condições do ambiente" });
      toggle.focus();
      await userEvent.keyboard("{Enter}");
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText("Temperatura do quarto")).toBeInTheDocument();
    });

    it("has no free 'Local' field (it duplicated 'Como adormeceu?')", async () => {
      await mount(session);
      expect(field("location")).toBeNull();
      expect(screen.queryByText("Local")).toBeNull();
    });

    it("quality uses the stars: tapping the checked star clears it", async () => {
      await mount(session);
      fireEvent.click(screen.getByRole("radio", { name: "4 de 5 estrelas" }));
      submit();
      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(sb.chains[0].ops[0][1][0]).toMatchObject({ quality: null });
    });

    it("the selects can be cleared with 'Não informar'", async () => {
      await mount(session);
      const placeholders = {
        "Como adormeceu": "Como adormeceu? (opcional)",
        "Motivo do despertar": "Por que acordou? (opcional)",
      };
      for (const [name, placeholder] of Object.entries(placeholders)) {
        fireEvent.click(screen.getByLabelText(name));
        const options = await screen.findAllByRole("option", { name: "Não informar" });
        await userEvent.click(options[options.length - 1]);
        await waitFor(() => expect(screen.getByLabelText(name)).toHaveTextContent(placeholder));
      }
      submit();
      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(sb.chains[0].ops[0][1][0]).toMatchObject({ how_fell_asleep: null, wake_reason: null });
    });
  });

  describe("refreshes the sleep screens (spec #14)", () => {
    it("create invalidates the sleep queries of the baby", async () => {
      await mount();
      change("start_time_input", "07:10");
      change("end_time_input", "08:40");
      submit();
      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(invalidate).toHaveBeenCalledTimes(1);
      expect(invalidate).toHaveBeenCalledWith(expect.anything(), "baby-1");
    });

    it("edit invalidates the sleep queries of the baby", async () => {
      await mount(session);
      submit();
      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(invalidate).toHaveBeenCalledTimes(1);
      expect(invalidate).toHaveBeenCalledWith(expect.anything(), "baby-1");
    });

    it("delete invalidates the sleep queries of the baby", async () => {
      await mount(session);
      fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
      fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(invalidate).toHaveBeenCalledTimes(1);
      expect(invalidate).toHaveBeenCalledWith(expect.anything(), "baby-1");
    });
  });
});
