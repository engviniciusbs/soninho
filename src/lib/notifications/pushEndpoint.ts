const EXACT_HOSTS = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
]);
const HOST_SUFFIXES = [".notify.windows.com", ".push.apple.com"];

/** Only well-known push services are allowed (prevents SSRF via stored endpoints). */
export function isAllowedPushEndpoint(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.port !== "") return false;
  const host = parsed.hostname.toLowerCase();
  return EXACT_HOSTS.has(host) || HOST_SUFFIXES.some((s) => host.endsWith(s));
}
