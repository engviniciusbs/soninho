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
const values = { name: "Lia", birth_date: "2025-11-01", avatar_emoji: "🦊", avatar_url: null };
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

  it("removes_baby", async () => {
    const { result } = setup();
    await act(() => result.current.remove("baby-1"));
    expect(sb.find("babies", "delete")[0].ops).toEqual([
      ["delete", []],
      ["eq", ["id", "baby-1"]],
    ]);
    expect(toast.success).toHaveBeenCalledWith("Bebê excluído");
  });
});
