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
    expect(await sendToSubscription(t.wp as never, good, "{}", t.store)).toBe(true);
    expect(t.update).not.toHaveBeenCalled();
  });

  it("skips and deactivates a disallowed endpoint", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const t = setup(async () => ({}));
    const bad = { ...good, endpoint: "https://169.254.169.254/x" };
    expect(await sendToSubscription(t.wp as never, bad, "{}", t.store)).toBe(false);
    expect(t.wp.sendNotification).not.toHaveBeenCalled();
    expect(t.update).toHaveBeenCalledWith({ is_active: false });
    expect(t.eq).toHaveBeenCalledWith("endpoint", bad.endpoint);
  });

  it("deactivates on 410", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t = setup(() => Promise.reject({ statusCode: 410 }));
    expect(await sendToSubscription(t.wp as never, good, "{}", t.store)).toBe(false);
    expect(t.update).toHaveBeenCalledWith({ is_active: false });
  });

  it("only logs on 500", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const t = setup(() => Promise.reject({ statusCode: 500 }));
    expect(await sendToSubscription(t.wp as never, good, "{}", t.store)).toBe(false);
    expect(t.update).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalledOnce();
    expect(String(err.mock.calls[0][0])).not.toContain("/fcm/send/x");
  });
});
