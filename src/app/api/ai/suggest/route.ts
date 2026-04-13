import { NextResponse } from "next/server";
import { z } from "zod";
import { openai, OPENAI_MODEL } from "@/lib/ai/openai";
import { getSleepSystemPrompt, SUGGESTION_PROMPT } from "@/lib/ai/prompts";
import { buildSleepContext } from "@/lib/ai/analyzeSleep";
import { createClient } from "@/lib/supabase/server";
import type { Baby, SleepSession } from "@/types";

const requestSchema = z.object({
  babyId: z.string().uuid(),
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

    const from = new Date();
    from.setDate(from.getDate() - 7);
    const { data: sessionsData } = await supabase
      .from("sleep_sessions")
      .select("*")
      .eq("baby_id", baby.id)
      .gte("start_time", from.toISOString())
      .lte("start_time", new Date().toISOString())
      .order("start_time", { ascending: false });

    const context = buildSleepContext(baby, (sessionsData ?? []) as SleepSession[]);
    const systemPrompt = getSleepSystemPrompt(context);

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: SUGGESTION_PROMPT },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";

    try {
      const suggestion = JSON.parse(text);
      return NextResponse.json(suggestion);
    } catch {
      return NextResponse.json({
        suggestedNapTime: "",
        windowStart: "",
        windowEnd: "",
        reasoning: text,
        confidence: "low" as const,
      });
    }
  } catch (error) {
    console.error("AI suggest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
