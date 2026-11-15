/**
 * Returns a normalized same-origin relative path, or `fallback`.
 * Rejects non-"/" starts, protocol-relative ("//host"), any control character
 * or backslash anywhere (the URL parser strips tab/CR/LF and treats "\" as "/"),
 * and anything that resolves to a different origin.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/app"
): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (/[\x00-\x1F\x7F\\]/.test(value)) return fallback;
  try {
    const u = new URL(value, "http://x");
    if (u.origin !== "http://x") return fallback;
    const out = u.pathname + u.search + u.hash;
    // Dot segments can collapse to a protocol-relative path ("/.//evil.com").
    if (out.startsWith("//") || out.includes("\\")) return fallback;
    return out;
  } catch {
    return fallback;
  }
}
