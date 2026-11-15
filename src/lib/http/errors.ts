import { NextResponse } from "next/server";

export function genericError(status = 500): NextResponse {
  return NextResponse.json({ error: "Ocorreu um erro. Tente novamente." }, { status });
}

/** Maps a database error to a safe client response; never exposes the raw message. */
export function dbErrorToResponse(error: { code?: string; message?: string }): NextResponse {
  console.error("DB error:", error);
  const msg = error.message ?? "";
  if (error.code === "23505") {
    return NextResponse.json({ error: "Registro duplicado" }, { status: 409 });
  }
  if (error.code === "42501") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  if (error.code === "P0001" && msg.includes("family_needs_owner")) {
    return NextResponse.json(
      { error: "A família precisa de pelo menos um responsável" },
      { status: 409 }
    );
  }
  if (error.code === "P0001" && msg.includes("invite_not_valid")) {
    return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 410 });
  }
  return genericError();
}
