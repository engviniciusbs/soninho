import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safeRedirect";

const FALLBACK_CASES: (string | null | undefined)[] = [
  "/\t/evil.com",
  "/\t\\evil.com",
  "//evil.com",
  "/\\evil.com",
  "/\r\n//evil.com",
  "https://evil.com",
  "@evil.com",
  "",
  null,
  undefined,
  "/.//evil.com",
  "/..//evil.com",
  "/a/../..//evil.com",
  "/%2e%2e//evil.com",
];
const UNCHANGED_CASES = ["/app", "/history?x=1", "/invite/abc#top", "/%2F%2Fevil.com"];
const ORIGIN = "https://soninho.baby";

describe("safeRedirectPath", () => {
  it.each(FALLBACK_CASES)("falls back for %j", (input) => {
    expect(safeRedirectPath(input)).toBe("/app");
  });

  it.each(UNCHANGED_CASES)("keeps %j unchanged", (input) => {
    expect(safeRedirectPath(input)).toBe(input);
  });

  it("normalizes dot segments", () => {
    expect(safeRedirectPath("/a/./b")).toBe("/a/b");
  });

  it("honors a custom fallback", () => {
    expect(safeRedirectPath("//x", "/login")).toBe("/login");
  });

  it.each([...FALLBACK_CASES, ...UNCHANGED_CASES, "/a/./b"])(
    "result for %j stays same-origin",
    (input) => {
      const r = safeRedirectPath(input);
      expect(new URL(r, ORIGIN).origin).toBe(ORIGIN);
    }
  );
});
