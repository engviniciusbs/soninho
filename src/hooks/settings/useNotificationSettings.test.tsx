// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@/test/render";
import { createRecordingSupabase, type RecordingSupabase } from "@/test/recordingSupabase";
import { useNotificationSettings } from "./useNotificationSettings";

const holder = vi.hoisted(() => ({ client: null as unknown, push: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => holder.client }));
vi.mock("@/hooks/usePushNotifications", () => ({ usePushNotifications: () => holder.push }));

const NOW = new Date("2026-01-01T12:00:00.000Z");
let sb: RecordingSupabase;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  sb = createRecordingSupabase();
  holder.client = sb.client;
  holder.push = {
    isSupported: true,
    permission: "default",
    isSubscribed: false,
    isLoading: false,
    subscribe: vi.fn(async () => true),
    unsubscribe: vi.fn(async () => true),
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const setup = () => renderHookWithProviders(() => useNotificationSettings());

describe("useNotificationSettings", () => {
  it("defaults_when_no_row", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.userId).toBe("user-1"));
    expect(result.current.prefs).toEqual({
      enabled: true,
      alertBefore: 15,
      quietStart: "22:00",
      quietEnd: "07:00",
      weeklyEmailEnabled: true,
    });
  });

  it("loads_row_with_null_fallbacks", async () => {
    sb.respond((c) =>
      c.ops.some(([m]) => m === "maybeSingle")
        ? { data: { enabled: false, alert_before_minutes: null, quiet_hours_start: "20:00", quiet_hours_end: null, weekly_email_enabled: null }, error: null }
        : undefined
    );
    const { result } = setup();
    await waitFor(() => expect(result.current.prefs.enabled).toBe(false));
    expect(result.current.prefs).toEqual({
      enabled: false,
      alertBefore: 15,
      quietStart: "20:00",
      quietEnd: "07:00",
      weeklyEmailEnabled: true,
    });
  });

  it("saves_only_given_columns_plus_timezone", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.userId).toBe("user-1"));
    act(() => result.current.edit({ alertBefore: 5 }));
    expect(sb.find("notification_preferences", "upsert")).toHaveLength(0);
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.save({ weeklyEmailEnabled: false });
    });
    expect(ok).toBe(true);
    expect(result.current.prefs).toMatchObject({ alertBefore: 5, weeklyEmailEnabled: false });
    expect(sb.find("notification_preferences", "upsert")[0].ops).toEqual([
      [
        "upsert",
        [
          {
            user_id: "user-1",
            weekly_email_enabled: false,
            timezone: "America/Sao_Paulo",
            updated_at: NOW.toISOString(),
          },
          { onConflict: "user_id" },
        ],
      ],
    ]);
  });

  it("does_not_write_when_signed_out", async () => {
    sb.setUser(null);
    const { result } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.save({ enabled: false });
    });
    expect(ok).toBe(false);
    expect(result.current.userId).toBeNull();
    expect(sb.find("notification_preferences")).toHaveLength(0);
  });

  it("exposes_push_controls", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = setup();
    await waitFor(() => expect(result.current.userId).toBe("user-1"));
    const { push } = result.current;
    expect(push.status).toEqual({
      isSupported: true,
      permission: "default",
      isSubscribed: false,
      isLoading: false,
    });
    await expect(push.enable()).resolves.toBe(true);
    await expect(push.test()).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledWith("/api/notifications/test", { method: "POST" });
  });

  it("track_raises_flag_for_the_duration_and_lowers_it_on_failure", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.userId).toBe("user-1"));
    expect(result.current.busy).toEqual({ saving: false, savingWeekly: false, testing: false });
    let release!: () => void;
    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.track("testing", () => new Promise<void>((r) => (release = r)));
    });
    expect(result.current.busy.testing).toBe(true);
    expect(result.current.busy.saving).toBe(false);
    await act(async () => {
      release();
      await pending;
    });
    expect(result.current.busy.testing).toBe(false);
    await act(async () => {
      await expect(
        result.current.track("saving", async () => {
          throw new Error("boom");
        })
      ).rejects.toThrow("boom");
    });
    expect(result.current.busy.saving).toBe(false);
  });
});
