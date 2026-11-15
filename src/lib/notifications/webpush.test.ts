import { afterEach, describe, expect, it, vi } from "vitest";
import { sendToSubscription } from "./webpush";

function setup(sendImpl: () => Promise<unknown>) {
  const eq = vi.fn().mockResolvedValue(undefined);
  const update = vi.fn().mockReturnValue({ eq });
  const store = { from: vi.fn().mockReturnValue({ update }) };
  const wp = { sendNotification: vi.fn(sendImpl) };
  return { eq, update, store, wp };
}

const good = { endpoint: "https://fcm.googleapis.com/fcm/send/x", p256dh: "p", auth: "a" };

afterEach(() => vi.restoreAllMocks());

describe("sendToSubscription", () => {
  it("sends to an allowed endpoint", async () => {
    const t = setup(async () => ({}));
    expect(await sendToSubscription(t.wp as never, good, "{}", t.store)).toBe("sent");
    expect(t.update).not.toHaveBeenCalled();
    expect(t.wp.sendNotification).toHaveBeenCalledWith(
      { endpoint: good.endpoint, keys: { p256dh: "p", auth: "a" } },
      "{}",
      { timeout: 10_000, TTL: 3600 }
    );
  });

  it("skips and deactivates a disallowed endpoint", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const t = setup(async () => ({}));
    const bad = { ...good, endpoint: "https://169.254.169.254/x" };
    expect(await sendToSubscription(t.wp as never, bad, "{}", t.store)).toBe("dead");
    expect(t.wp.sendNotification).not.toHaveBeenCalled();
    expect(t.update).toHaveBeenCalledWith({ is_active: false });
    expect(t.eq).toHaveBeenCalledWith("endpoint", bad.endpoint);
  });

  it("deactivates on 410", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t = setup(() => Promise.reject({ statusCode: 410 }));
    expect(await sendToSubscription(t.wp as never, good, "{}", t.store)).toBe("dead");
    expect(t.update).toHaveBeenCalledWith({ is_active: false });
  });

  it("only logs on 500", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const t = setup(() => Promise.reject({ statusCode: 500 }));
    expect(await sendToSubscription(t.wp as never, good, "{}", t.store)).toBe("failed");
    expect(t.update).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalledOnce();
    expect(String(err.mock.calls[0][0])).not.toContain("/fcm/send/x");
  });

  it("passes a custom TTL", async () => {
    const t = setup(async () => ({}));
    await sendToSubscription(t.wp as never, good, "{}", t.store, { ttl: 900 });
    expect(t.wp.sendNotification).toHaveBeenCalledWith(expect.anything(), "{}", {
      timeout: 10_000,
      TTL: 900,
    });
  });

  it.each([400, 404, 413])("deactivates on permanent %i", async (statusCode) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t = setup(() => Promise.reject({ statusCode }));
    expect(await sendToSubscription(t.wp as never, good, "{}", t.store)).toBe("dead");
    expect(t.update).toHaveBeenCalledWith({ is_active: false });
  });

  it("rejects on 403 without deactivating (VAPID mismatch hits every subscription)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t = setup(() => Promise.reject({ statusCode: 403 }));
    expect(await sendToSubscription(t.wp as never, good, "{}", t.store)).toBe("rejected");
    expect(t.update).not.toHaveBeenCalled();
  });

  it.each([429, undefined])("treats %s as transient", async (statusCode) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t = setup(() => Promise.reject(statusCode ? { statusCode } : new Error("Socket timeout")));
    expect(await sendToSubscription(t.wp as never, good, "{}", t.store)).toBe("failed");
    expect(t.update).not.toHaveBeenCalled();
  });
});
