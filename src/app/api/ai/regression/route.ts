import { NextResponse } from "next/server";
import { z } from "zod";
import { differenceInWeeks, differenceInMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getRecentSessions } from "@/lib/supabase/queries";
import { openai, OPENAI_MODEL } from "@/lib/ai/openai";
import { detectRegression, computeSleepDebt } from "@/lib/sleep/regression";
import { getAgeSchedule } from "@/lib/sleep/schedules";
import type { Baby, SleepSession } from "@/types";

const requestSchema = z.object({
  babyId: z.string().uuid(),
  timezone: z.string().default("America/Sao_Paulo"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: babyData, error: babyError } = await supabase
      .from("babies")
      .select("*")
      .eq("id", parsed.data.babyId)
      .single();

    if (babyError || !babyData) {
      return NextResponse.json({ error: "Baby not found" }, { status: 404 });
    }
    const baby = babyData as Baby;

    const { data: sessionsData } = await getRecentSessions(
      supabase,
      baby.id,
      21
    );
    const sessions = (sessionsData ?? []) as SleepSession[];

    const ageWeeks = differenceInWeeks(new Date(), new Date(baby.birth_date));
    const ageMonths = differenceInMonths(new Date(), new Date(baby.birth_date));
    const regression = detectRegression(baby.birth_date, sessions);
    const debt = computeSleepDebt(sessions, ageWeeks, 7);
    const schedule = getAgeSchedule(ageWeeks);

    const base = {
      detected: regression.detected,
      ageWindow: regression.ageWindow?.label ?? null,
      summary: regression.summary,
      debtHours: debt.debtHours,
      sleepDropHours: regression.sleepDropHours,
    };

    // Only spend an LLM call when there is something to explain.
    if (!regression.detected) {
      return NextResponse.json({
        ...base,
        explanation: null,
        tips: [],
      });
    }

    const context = [
      `Idade do bebê: ${ageWeeks} semanas (${ageMonths} meses).`,
      regression.ageWindow
        ? `Está na fase de ${regression.ageWindow.label}.`
        : "Fora de janelas clássicas de regressão.",
      regression.sleepDropHours > 0
        ? `Queda média de ${regression.sleepDropHours}h/dia no sono recente.`
        : "Sem queda relevante no total de sono.",
      regression.wakeIncrease > 0
        ? `Aumento de ~${regression.wakeIncrease} despertar(es) por noite.`
        : "Sem aumento claro de despertares.",
      `Meta de sono para a idade: ${schedule.totalSleepHours}h/dia; média atual ${debt.avgHours}h/dia.`,
    ].join(" ");

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0,
      seed: 42,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Você é um consultor de sono infantil acolhedor e baseado em evidências. " +
            "Responda SEMPRE em português do Brasil e SOMENTE em JSON válido com as chaves " +
            '"explanation" (string curta, 1-2 frases, tom tranquilizador) e "tips" ' +
            "(array de 2 a 3 strings curtas e acionáveis). Não dê diagnóstico médico.",
        },
        {
          role: "user",
          content: `Contexto do bebê: ${context}\n\nExplique de forma breve o que pode estar acontecendo e dê 2-3 dicas práticas.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let explanation: string | null = null;
    let tips: string[] = [];
    try {
      const json = JSON.parse(raw);
      explanation = typeof json.explanation === "string" ? json.explanation : null;
      tips = Array.isArray(json.tips)
        ? json.tips.filter((t: unknown): t is string => typeof t === "string").slice(0, 3)
        : [];
    } catch {
      explanation = null;
      tips = [];
    }

    return NextResponse.json({ ...base, explanation, tips });
  } catch (error) {
    console.error("AI regression error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
