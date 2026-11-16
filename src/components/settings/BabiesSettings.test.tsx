// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { createRecordingSupabase, type RecordingSupabase } from "@/test/recordingSupabase";
import type { Baby } from "@/types";
import { BabiesSettings } from "./BabiesSettings";

const holder = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => holder.client }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/components/settings/BabyProfileForm", () => ({ BabyProfileForm: () => null }));

const lia = { id: "b-1", name: "Lia", birth_date: "2025-11-01", family_id: "fam-F" } as Baby;
const theo = { id: "b-2", name: "Theo", birth_date: "2024-05-01", family_id: "fam-G" } as Baby;
let sb: RecordingSupabase;

beforeEach(() => {
  sb = createRecordingSupabase();
  holder.client = sb.client;
  // The signed-in user owns only fam-F; in fam-G they are a caregiver.
  sb.respond((c) =>
    c.target === "family_members" ? { data: [{ family_id: "fam-F" }], error: null } : undefined
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function setup(babies: Baby[]) {
  return renderWithProviders(<BabiesSettings />, {
    baby: { activeBaby: babies[0], babies },
  });
}

describe("BabiesSettings", () => {
  it("shows_delete_only_for_babies_of_families_the_user_owns", async () => {
    setup([lia, theo]);
    expect(await screen.findByRole("button", { name: "Excluir Lia" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir Theo" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Editar/ })).toHaveLength(2);
  });

  it("caregiver_sees_no_delete_button", async () => {
    sb.respond((c) => (c.target === "family_members" ? { data: [], error: null } : undefined));
    setup([theo]);
    await screen.findByText("Theo");
    // let the owned-families query settle
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole("button", { name: /^Excluir/ })).not.toBeInTheDocument();
  });

  it("delete_warning_mentions_sleep_and_feeding_and_uses_delete_baby", async () => {
    setup([lia, theo]);
    fireEvent.click(await screen.findByRole("button", { name: "Excluir Lia" }));
    expect(
      await screen.findByText(/todos os registros de sono e alimentação/i)
    ).toBeInTheDocument();
    // Lia is the only baby of fam-F: the family goes too.
    expect(screen.getByText(/a família, os convites e os recados também/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await vi.waitFor(() =>
      expect(sb.find("rpc:delete_baby")[0]?.ops).toEqual([["rpc", [{ p_baby_id: "b-1" }]]])
    );
    expect(sb.find("babies", "delete")).toHaveLength(0);
  });
});
