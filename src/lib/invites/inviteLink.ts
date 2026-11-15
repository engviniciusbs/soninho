/**
 * Invite link helpers.
 *
 * Legacy tokens are base64 and may contain `/`, `+` and `=`, so the token is
 * always percent-encoded when building a link. New tokens are hex.
 *
 * Next.js (route-matcher) already decodes dynamic segments ONCE before
 * handing `params` to pages/route handlers, so a token read from `params`
 * normally contains no `%` and `normalizeInviteToken` is a no-op. It only
 * decodes when a `%` is still present (e.g. client `useParams` returning the
 * raw segment), and exactly once, so `%2B` never turns into a space.
 */
export function buildInviteLink(origin: string, token: string): string {
  return `${origin}/invite/${encodeURIComponent(token)}`;
}

export function normalizeInviteToken(raw: string): string {
  if (!raw.includes("%")) return raw;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
