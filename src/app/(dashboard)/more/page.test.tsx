// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { renderWithProviders } from "@/test/render";
import { createRecordingSupabase, type RecordingSupabase } from "@/test/recordingSupabase";
import type { Baby } from "@/types";
import BabiesPage from "./babies/page";
import FamilyPage from "./family/page";
import NotificationsPage from "./notifications/page";
import ReportsPage from "./reports/page";

const holder = vi.hoisted(() => ({
  client: null as unknown,
  push: null as unknown,
  router: { push: () => {}, refresh: () => {} },
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => holder.client }));
vi.mock("@/hooks/usePushNotifications", () => ({ usePushNotifications: () => holder.push }));
vi.mock("next/navigation", () => ({ useRouter: () => holder.router }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
// Out of scope here (own tests / Task 7); stubs expose the props they receive.
vi.mock("@/components/settings/FamilySettings", () => ({
  FamilySettings: (p: { babyId: string; currentUserId: string }) => (
    <div data-testid="family" data-baby={p.babyId} data-user={p.currentUserId} />
  ),
}));
vi.mock("@/components/settings/UserProfileSettings", () => ({
  UserProfileSettings: () => <div data-testid="user-profile" />,
}));
vi.mock("@/components/family/FamilyNoteCard", () => ({
  FamilyNoteCard: () => <div data-testid="family-notes" />,
}));
// The PDF card (moved from /history) runs its own sleep_sessions query.
vi.mock("@/components/settings/SleepReportPdfCard", () => ({
  SleepReportPdfCard: () => <div data-testid="pdf-report" />,
}));

const NOW = new Date("2026-01-01T12:00:00.000Z");
const baby = {
  id: "baby-1",
  name: "Lia",
  birth_date: "2025-11-01",
  avatar_emoji: "\u{1F98A}",
  avatar_url: null,
  family_id: "fam-1",
} as Baby;
const PREFS = {
  enabled: false,
  alert_before_minutes: 10,
  quiet_hours_start: "21:00",
  quiet_hours_end: "06:30",
  weekly_email_enabled: false,
};
let sb: RecordingSupabase;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Only Date is faked: user-event and waitFor need real timers.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  sb = createRecordingSupabase();
  sb.respond((c) => {
    if (c.target === "notification_preferences" && c.ops.some(([m]) => m === "maybeSingle")) {
      return { data: PREFS, error: null };
    }
    // The signed-in user owns Lia's family (may delete her).
    if (c.target === "family_members") return { data: [{ family_id: "fam-1" }], error: null };
    return undefined;
  });
  holder.client = sb.client;
  holder.push = {
    isSupported: true,
    permission: "granted",
    isSubscribed: true,
    isLoading: false,
    subscribe: vi.fn(async () => true),
    unsubscribe: vi.fn(async () => true),
  };
  fetchMock = vi.fn(async () => Response.json({ email: "a@b.c" }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/** Renders one Mais detail page (each former settings tab is its own route now). */
async function mount(Page: ComponentType = BabiesPage) {
  const user = userEvent.setup();
  const view = renderWithProviders(<Page />, {
    baby: { activeBaby: baby, babies: [baby] },
  });
  await settle();
  return { user, ...view };
}

/**
 * Clone with React `useId` values renumbered in order of appearance: client ids
 * come from a global mount counter, so they shift with unrelated hook calls,
 * while the renumbered form still captures which elements reference each other.
 */
function stable(node: Element): Element {
  const clone = node.cloneNode(true) as Element;
  const ids = new Map<string, string>();
  for (const el of [clone, ...clone.querySelectorAll("*")]) {
    for (const attr of [...el.attributes]) {
      const next = attr.value.replace(/_r_[0-9a-z]+_/g, (id) => {
        if (!ids.has(id)) ids.set(id, `id${ids.size + 1}`);
        return ids.get(id)!;
      });
      if (next !== attr.value) el.setAttribute(attr.name, next);
    }
  }
  return clone;
}

/** Leaves the current page and opens another, as the Mais list does. */
async function openPage(Page: ComponentType) {
  cleanup();
  return mount(Page);
}

/** Waits out base-ui's transient enter/exit markers (cleared on the next frame). */
async function settle() {
  await waitFor(() =>
    expect(document.querySelector("[data-starting-style],[data-ending-style]")).toBeNull()
  );
}

describe("Mais detail pages (former settings tabs)", () => {
  it("renders_each_page", async () => {
    let { container } = await mount(BabiesPage);
    expect(screen.getByText("Lia")).toBeInTheDocument();
    // Delete shows once the owned families load (the user owns Lia's family).
    await screen.findByRole("button", { name: "Excluir Lia" });
    expect(stable(container)).toMatchSnapshot("general");

    ({ container } = await openPage(FamilyPage));
    await screen.findByTestId("family");
    expect(screen.getByTestId("family")).toHaveAttribute("data-user", "user-1");
    expect(screen.getByTestId("family")).toHaveAttribute("data-baby", "baby-1");
    expect(stable(container)).toMatchSnapshot("family");

    ({ container } = await openPage(NotificationsPage));
    expect(screen.queryByText("Bebês")).not.toBeInTheDocument();
    await screen.findByText("Desativado"); // weekly email loaded from prefs
    expect(stable(container)).toMatchSnapshot("notifications");

    ({ container } = await openPage(ReportsPage));
    expect(screen.getByText("Exportar dados")).toBeInTheDocument();
    expect(stable(container)).toMatchSnapshot("tools");

    await openPage(BabiesPage);
    expect(screen.getByText("Bebês")).toBeInTheDocument();
  });

  it("saves_baby_same_payload", async () => {
    const { user, queryClient } = await mount();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    // Edit: trimmed name; the stored avatar_emoji and avatar_url (null) ride along
    // unchanged (the emoji picker left the form in the redesign, spec §8.10).
    await user.click(screen.getByRole("button", { name: "Editar Lia" }));
    const dialog = await screen.findByRole("dialog");
    await settle();
    expect(stable(dialog)).toMatchSnapshot("edit form");
    const name = screen.getByPlaceholderText("Nome do bebê");
    await user.clear(name);
    await user.type(name, "  Lia Maria  ");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Bebê atualizado"));
    expect(sb.find("babies", "update").map((c) => c.ops)).toEqual([
      [
        // The form now also edits the sex ("Não informar" is null).
        ["update", [{ name: "Lia Maria", birth_date: "2025-11-01", avatar_emoji: "\u{1F98A}", avatar_url: null, sex: null }]],
        ["eq", ["id", "baby-1"]],
        ["select", []],
        ["single", []],
      ],
    ]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["babies"] });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // Add: required fields validated via the existing toast, then RPC payload.
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    await screen.findByRole("dialog");
    expect(screen.getByPlaceholderText("Nome do bebê")).toHaveValue("");
    await user.type(screen.getByPlaceholderText("Nome do bebê"), "Theo");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(toast.error).toHaveBeenCalledWith("Preencha nome e data de nascimento");
    expect(sb.find("rpc:create_baby_with_family")).toHaveLength(0);

    const date = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(date, "2026-01-01");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Bebê adicionado"));
    expect(sb.find("rpc:create_baby_with_family").map((c) => c.ops)).toEqual([
      [
        [
          "rpc",
          [
            {
              p_name: "Theo",
              p_birth_date: "2026-01-01",
              p_avatar_emoji: "\u{1F37C}",
              p_avatar_url: null,
              // "Não informar" goes to the RPC as null (saved in the same insert).
              p_sex: null,
              // Second baby joins the active baby's family (spec decision 3).
              p_family_id: "fam-1",
            },
          ],
        ],
      ],
    ]);
  });

  it("uploads_avatar_same_path", async () => {
    const { user } = await mount();
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    await screen.findByRole("dialog");

    const big = new File(["x"], "big.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 5 * 1024 * 1024 + 1 });
    await user.upload(screen.getByLabelText("Selecionar foto do bebê"), big);
    expect(toast.error).toHaveBeenCalledWith("Foto muito grande. Máximo 5 MB.");
    expect(sb.uploads).toHaveLength(0);

    const file = new File(["img"], "foto.webp", { type: "image/webp" });
    await user.upload(screen.getByLabelText("Selecionar foto do bebê"), file);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Foto carregada!"));
    const path = `user-1/${NOW.getTime()}.webp`;
    expect(sb.uploads).toEqual([
      { bucket: "baby-avatars", path, file, opts: { upsert: true, contentType: "image/webp" } },
    ]);
    expect(screen.getByText("Toque para alterar a foto")).toBeInTheDocument();
    await settle();
    expect(stable(screen.getByRole("dialog"))).toMatchSnapshot("form with photo");

    await user.type(screen.getByPlaceholderText("Nome do bebê"), "Theo");
    await user.type(document.querySelector('input[type="date"]') as HTMLInputElement, "2026-01-01");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(sb.find("rpc:create_baby_with_family")).toHaveLength(1));
    expect(sb.find("rpc:create_baby_with_family")[0].ops[0][1][0]).toMatchObject({
      p_avatar_url: `https://cdn.test/baby-avatars/${path}`,
    });
  });

  it("saves_notification_prefs_same_payload", async () => {
    const { user } = await mount(NotificationsPage);
    await screen.findByText("Desativado");
    expect(sb.find("notification_preferences", "maybeSingle").map((c) => c.ops)).toEqual([
      [["select", ["*"]], ["eq", ["user_id", "user-1"]], ["maybeSingle", []]],
    ]);

    await user.click(screen.getByRole("button", { name: "20" }));
    const [start] = document.querySelectorAll('input[type="time"]');
    await user.clear(start);
    await user.type(start, "21:30");
    await user.click(screen.getAllByRole("switch")[0]); // Envio automático
    await user.click(screen.getByRole("button", { name: "Salvar preferências" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Preferências de notificação salvas!")
    );

    await user.click(screen.getByRole("switch", { name: "Relatório semanal por e-mail" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Relatório semanal ativado!"));

    const updated_at = NOW.toISOString();
    expect(sb.find("notification_preferences", "upsert").map((c) => c.ops)).toEqual([
      [
        [
          "upsert",
          [
            {
              user_id: "user-1",
              enabled: true,
              alert_before_minutes: 20,
              quiet_hours_start: "21:30",
              quiet_hours_end: "06:30",
              timezone: "America/Sao_Paulo",
              updated_at,
            },
            { onConflict: "user_id" },
          ],
        ],
      ],
      [
        [
          "upsert",
          [
            { user_id: "user-1", weekly_email_enabled: true, timezone: "America/Sao_Paulo", updated_at },
            { onConflict: "user_id" },
          ],
        ],
      ],
    ]);

    await user.click(screen.getByRole("button", { name: "Testar" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Notificação de teste enviada!")
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/notifications/test", { method: "POST" });

    await user.click(screen.getByRole("button", { name: "Desativar" }));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Notificações desativadas"));
    expect((holder.push as { unsubscribe: () => void }).unsubscribe).toHaveBeenCalled();
  });

  it("export_csv_same_content", async () => {
    // Honours .range(): the rows on the first page, then an empty page (the
    // export now reads until an empty page, so a mock that answered the same
    // rows for every range would never end).
    sb.respond((c) =>
      c.target === "sleep_sessions" &&
      (c.ops.find(([m]) => m === "range")?.[1] as [number, number] | undefined)?.[0] === 0
        ? {
            data: [
              {
                type: "NAP",
                start_time: "2026-01-01T10:00:00Z",
                end_time: "2026-01-01T11:00:00Z",
                duration_min: 60,
                quality: 4,
                location: "berço",
                notes: 'dormiu "bem", sem choro',
              },
              {
                type: "NIGHT",
                start_time: "2025-12-31T23:00:00Z",
                end_time: null,
                duration_min: null,
                quality: null,
                location: null,
                notes: "=cmd",
              },
            ],
            error: null,
          }
        : c.target === "sleep_sessions"
          ? { data: [], error: null }
          : undefined
    );
    let blob: Blob | null = null;
    vi.stubGlobal("URL", Object.assign(URL, {
      createObjectURL: vi.fn((b: Blob) => ((blob = b), "blob:csv")),
      revokeObjectURL: vi.fn(),
    }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      expect(this.download).toBe("soninho-Lia-2026-01-01.csv");
      expect(this.href).toBe("blob:csv");
    });

    const { user } = await mount(ReportsPage);
    await user.click(screen.getByRole("button", { name: "Exportar CSV" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Dados exportados com sucesso"));

    expect(sb.find("sleep_sessions").map((c) => c.ops)).toEqual([
      [
        ["select", ["*"]],
        ["eq", ["baby_id", "baby-1"]],
        ["order", ["start_time", { ascending: false }]],
        ["order", ["id", { ascending: true }]],
        ["range", [0, 999]],
      ],
      [
        ["select", ["*"]],
        ["eq", ["baby_id", "baby-1"]],
        ["order", ["start_time", { ascending: false }]],
        ["order", ["id", { ascending: true }]],
        ["range", [2, 1001]],
      ],
    ]);
    expect(click).toHaveBeenCalledTimes(1);
    expect(blob!.type).toBe("text/csv;charset=utf-8;");
    expect(await blob!.text()).toBe(
      [
        "Tipo,Início,Fim,Duração (min),Qualidade,Local,Notas",
        'Soneca,2026-01-01T10:00:00Z,2026-01-01T11:00:00Z,60,4,berço,"dormiu ""bem"", sem choro"',
        "Sono Noturno,2025-12-31T23:00:00Z,,,,,'=cmd",
      ].join("\n")
    );
  });

  it("request_report_same_request", async () => {
    const { user } = await mount(ReportsPage);
    await user.click(screen.getByRole("button", { name: "30 dias" }));
    await user.click(screen.getByRole("button", { name: "Enviar relatório agora" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Relatório enviado para a@b.c"));
    expect(fetchMock).toHaveBeenCalledWith("/api/email/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: 30 }),
    });
  });
});
