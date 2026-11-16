// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { toast } from "sonner";
import { renderHookWithProviders } from "@/test/render";
import { createRecordingSupabase, type RecordingSupabase } from "@/test/recordingSupabase";
import type { Baby } from "@/types";
import { useBabySettings } from "./useBabySettings";

const holder = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => holder.client }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const baby = { id: "baby-1", name: "Lia" } as Baby;
const values = { name: "Lia", birth_date: "2025-11-01", avatar_emoji: "🦊", avatar_url: null, sex: null };
let sb: RecordingSupabase;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
  sb = createRecordingSupabase();
  holder.client = sb.client;
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

function setup() {
  return renderHookWithProviders(() => useBabySettings(), {
    baby: { activeBaby: baby, babies: [baby] },
  });
}

describe("useBabySettings", () => {
  it("exposes_the_active_baby", () => {
    const { result } = setup();
    expect(result.current.baby).toBe(baby);
    expect(result.current.babies).toEqual([baby]);
    expect(result.current.isSaving).toBe(false);
  });

  it("updates_existing_baby", async () => {
    const { result, queryClient } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.save({ id: "baby-1", ...values });
    });
    expect(ok).toBe(true);
    expect(sb.find("babies", "update")[0].ops.slice(0, 2)).toEqual([
      ["update", [values]],
      ["eq", ["id", "baby-1"]],
    ]);
    expect(toast.success).toHaveBeenCalledWith("Bebê atualizado");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["babies"] });
  });

  it("keeps_form_open_when_signed_out_on_create", async () => {
    sb.setUser(null);
    const { result } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.save({ id: null, ...values });
    });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Usuário não autenticado");
    expect(sb.find("rpc:create_baby_with_family")).toHaveLength(0);
    expect(result.current.isSaving).toBe(false);
  });

  it("create_error_keeps_form_open_with_toast", async () => {
    sb.respond((c) => (c.target.startsWith("rpc:") ? { data: null, error: { message: "x" } } : undefined));
    const { result, queryClient } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.save({ id: null, ...values });
    });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Erro ao adicionar bebê");
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });

  it("update_error_keeps_form_open_with_toast", async () => {
    sb.respond((c) => (c.target === "babies" ? { data: null, error: { message: "x" } } : undefined));
    const { result } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.save({ id: "baby-1", ...values });
    });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Erro ao atualizar bebê");
    expect(toast.success).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });

  it("uploads_avatar_and_returns_public_url", async () => {
    const { result } = setup();
    const file = new File(["x"], "a.jpeg", { type: "image/jpeg" });
    let url: string | null = null;
    await act(async () => {
      url = await result.current.uploadAvatar(file);
    });
    const path = `user-1/${Date.now()}.jpeg`;
    expect(sb.uploads).toEqual([
      { bucket: "baby-avatars", path, file, opts: { upsert: true, contentType: "image/jpeg" } },
    ]);
    expect(url).toBe(`https://cdn.test/baby-avatars/${path}`);
    expect(result.current.isUploading).toBe(false);
  });

  it("removes_baby_through_delete_baby_rpc", async () => {
    const { result, queryClient } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.remove("baby-1");
    });
    expect(ok).toBe(true);
    expect(sb.find("babies", "delete")).toHaveLength(0);
    expect(sb.find("rpc:delete_baby")[0].ops).toEqual([["rpc", [{ p_baby_id: "baby-1" }]]]);
    expect(toast.success).toHaveBeenCalledWith("Bebê excluído");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["babies"] });
  });

  it("delete_refused_is_an_error_not_a_success", async () => {
    sb.respond((c) =>
      c.target === "rpc:delete_baby"
        ? { data: null, error: { code: "42501", message: "forbidden_baby_delete" } }
        : undefined
    );
    const { result } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.remove("baby-1");
    });
    expect(ok).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Só quem é dono da família pode excluir o bebê");
  });

  it("second_baby_joins_the_active_babys_family_when_owner", async () => {
    sb.respond((c) =>
      c.target === "family_members"
        ? { data: [{ family_id: "fam-F" }, { family_id: "fam-G" }], error: null }
        : undefined
    );
    const { result } = renderHookWithProviders(() => useBabySettings(), {
      baby: { activeBaby: { ...baby, family_id: "fam-F" }, babies: [{ ...baby, family_id: "fam-F" }] },
    });
    await act(async () => {
      await result.current.save({ id: null, ...values });
    });
    const owned = sb.find("family_members")[0].ops;
    expect(owned).toContainEqual(["eq", ["user_id", "user-1"]]);
    expect(owned).toContainEqual(["eq", ["role", "owner"]]);
    const [args] = sb.find("rpc:create_baby_with_family")[0].ops[0][1] as [Record<string, unknown>];
    expect(args.p_family_id).toBe("fam-F");
  });

  it("omits_family_when_not_owner_of_the_active_babys_family", async () => {
    sb.respond((c) => (c.target === "family_members" ? { data: [], error: null } : undefined));
    const { result } = renderHookWithProviders(() => useBabySettings(), {
      baby: { activeBaby: { ...baby, family_id: "fam-X" }, babies: [{ ...baby, family_id: "fam-X" }] },
    });
    await act(async () => {
      await result.current.save({ id: null, ...values });
    });
    const [args] = sb.find("rpc:create_baby_with_family")[0].ops[0][1] as [Record<string, unknown>];
    expect(args).not.toHaveProperty("p_family_id");
  });

  it("first_baby_omits_family", async () => {
    const { result } = renderHookWithProviders(() => useBabySettings(), {
      baby: { activeBaby: null, babies: [] },
    });
    await act(async () => {
      await result.current.save({ id: null, ...values });
    });
    const [args] = sb.find("rpc:create_baby_with_family")[0].ops[0][1] as [Record<string, unknown>];
    expect(args).not.toHaveProperty("p_family_id");
  });

  it("edit_saves_the_sex", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.save({ id: "baby-1", ...values, sex: "F" });
    });
    expect(sb.find("babies", "update")[0].ops[0]).toEqual(["update", [{ ...values, sex: "F" }]]);
  });

  it("create_with_sex_sends_it_to_the_rpc_in_one_atomic_call", async () => {
    const { result } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.save({ id: null, ...values, sex: "M" });
    });
    expect(ok).toBe(true);
    const [args] = sb.find("rpc:create_baby_with_family")[0].ops[0][1] as [Record<string, unknown>];
    expect(args.p_sex).toBe("M");
    expect(sb.find("babies", "update")).toHaveLength(0);
    expect(toast.success).toHaveBeenCalledWith("Bebê adicionado");
  });

  it("create_without_sex_sends_null", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.save({ id: null, ...values });
    });
    const [args] = sb.find("rpc:create_baby_with_family")[0].ops[0][1] as [Record<string, unknown>];
    expect(args.p_sex).toBeNull();
    expect(sb.find("babies", "update")).toHaveLength(0);
  });
});

