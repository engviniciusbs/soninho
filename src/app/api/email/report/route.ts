import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getResendClient,
  sendSleepReport,
} from "@/lib/email/sleepReport";
import { isValidReportPeriod } from "@/lib/email/reportConstants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.email) {
    return NextResponse.json({ error: "E-mail não encontrado na conta" }, { status: 400 });
  }

  let body: { days?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const days = body.days;
  if (days == null || !isValidReportPeriod(days)) {
    return NextResponse.json(
      { error: "Período inválido. Use 7, 14 ou 30 dias." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const hourKey = format(new Date(), "yyyy-MM-dd-HH");
  const dedupeKey = `${user.id}:manual:${days}:${hourKey}`;

  const { data: recent } = await admin
    .from("email_log")
    .select("id")
    .eq("dedupe_key", dedupeKey)
    .limit(1);

  if (recent && recent.length > 0) {
    return NextResponse.json(
      {
        error: "Você já solicitou este relatório na última hora. Tente novamente em breve.",
      },
      { status: 429 }
    );
  }

  const { data: babies, error: babiesError } = await supabase
    .from("babies")
    .select("id, name, birth_date, avatar_emoji")
    .order("created_at", { ascending: true });

  if (babiesError) {
    console.error("[email/report] babies error:", babiesError);
    return NextResponse.json({ error: "Erro ao carregar bebês" }, { status: 500 });
  }

  if (!babies || babies.length === 0) {
    return NextResponse.json(
      { error: "Cadastre um bebê antes de solicitar o relatório." },
      { status: 400 }
    );
  }

  const parentName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "";

  try {
    const resend = getResendClient();
    const result = await sendSleepReport({
      supabase: admin,
      resend,
      userId: user.id,
      email: user.email,
      parentName,
      periodDays: days,
      kind: "manual",
      dedupeKey,
      babies,
    });

    if (result.ok === false) {
      if (result.reason === "no_data") {
        return NextResponse.json(
          {
            error: `Não há registros de sono completos nos últimos ${days} dias para enviar.`,
          },
          { status: 400 }
        );
      }
      if (result.reason === "deduped") {
        return NextResponse.json(
          { error: "Relatório já enviado recentemente." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "Não foi possível enviar o e-mail. Tente novamente." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      days,
      email: user.email,
    });
  } catch (err) {
    console.error("[email/report] Error:", err);
    return NextResponse.json(
      { error: "Falha ao enviar relatório por e-mail" },
      { status: 500 }
    );
  }
}
