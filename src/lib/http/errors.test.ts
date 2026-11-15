import { describe, it, expect, vi, beforeEach } from "vitest";
import { genericError, dbErrorToResponse } from "./errors";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("errors", () => {
  it("genericError", async () => {
    const r = genericError();
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "Ocorreu um erro. Tente novamente." });
    expect(genericError(400).status).toBe(400);
  });

  const cases: [{ code?: string; message?: string }, number, string][] = [
    [{ code: "23505" }, 409, "Registro duplicado"],
    [{ code: "42501" }, 403, "Sem permissão"],
    [{ code: "P0001", message: "family_needs_owner" }, 409, "A família precisa de pelo menos um responsável"],
    [{ code: "P0001", message: "invite_not_valid" }, 410, "Convite inválido ou expirado"],
    [{ code: "P0001", message: "other" }, 500, "Ocorreu um erro. Tente novamente."],
    [{ code: "XX000" }, 500, "Ocorreu um erro. Tente novamente."],
    [{}, 500, "Ocorreu um erro. Tente novamente."],
  ];
  it.each(cases)("maps %j", async (err, status, msg) => {
    const r = dbErrorToResponse(err);
    expect(r.status).toBe(status);
    expect(await r.json()).toEqual({ error: msg });
    expect(console.error).toHaveBeenCalled();
  });

  it("never leaks raw message", async () => {
    const r = dbErrorToResponse({ code: "23505", message: 'duplicate key "secret_idx"' });
    expect(JSON.stringify(await r.json())).not.toContain("secret_idx");
  });
});
