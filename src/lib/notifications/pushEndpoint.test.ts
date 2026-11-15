import { describe, expect, it } from "vitest";
import { isAllowedPushEndpoint } from "./pushEndpoint";

describe("isAllowedPushEndpoint", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/x",
    "https://updates.push.services.mozilla.com/wpush/v2/x",
    "https://web.push.apple.com/x",
    "https://wns2-bl2p.notify.windows.com/w/?token=x",
  ])("accepts %s", (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(true);
  });

  it.each([
    "http://fcm.googleapis.com/x",
    "https://fcm.googleapis.com.evil.com/x",
    "https://evil.com/fcm.googleapis.com",
    "https://169.254.169.254/",
    "https://localhost/",
    "https://fcm.googleapis.com:8443/x",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(false);
  });
});
