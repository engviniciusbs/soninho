/**
 * Returns `value` only if it is a same-origin relative path; otherwise `fallback`.
 * Rejects protocol-relative ("//host"), backslash ("/\\host") and CR/LF values.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/app"
): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(value)) return fallback;
  return value;
}
