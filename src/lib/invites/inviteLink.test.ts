import { describe, expect, it } from "vitest";
import { buildInviteLink, normalizeInviteToken } from "./inviteLink";

const ORIGIN = "https://soninho.baby";
const HEX48 = "0123456789abcdef".repeat(3);

describe("invite links", () => {
  it.each(["abc+/=", "a/b/c", "plain123", HEX48])("invite_link_roundtrip %s", (t) => {
    const link = buildInviteLink(ORIGIN, t);
    const segment = link.slice(`${ORIGIN}/invite/`.length);
    expect(segment).not.toContain("/");
    expect(normalizeInviteToken(segment)).toBe(t);
  });

  it("does not double-decode an already decoded token", () => {
    expect(normalizeInviteToken("abc+/=")).toBe("abc+/=");
  });

  it("returns invalid encodings unchanged without throwing", () => {
    expect(normalizeInviteToken("%E0%A4%A")).toBe("%E0%A4%A");
  });
});
