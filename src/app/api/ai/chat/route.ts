import { z } from "zod";
import { openai, OPENAI_MODEL } from "@/lib/ai/openai";
import { getSleepSystemPrompt } from "@/lib/ai/prompts";
import { buildSleepContext } from "@/lib/ai/analyzeSleep";
import { createClient } from "@/lib/supabase/server";
import type { Baby, SleepSession } from "@/types";

const requestSchema = z.object({
  babyId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response("Invalid request", { status: 400 });
    }

    const supabase = await createClient();
    const { data: babyData, error: babyError } = await supabase
      .from("babies")
      .select("*")
      .eq("id", parsed.data.babyId)
      .single();
    if (babyError || !babyData) {
      return new Response("Baby not found", { status: 404 });
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

    // Aggregate recent suggestion feedback so the AI can self-calibrate tone.
    const fbFrom = new Date();
    fbFrom.setDate(fbFrom.getDate() - 21);
    const { data: feedbackData } = await supabase
      .from("nap_suggestion_feedback")
      .select("vote")
      .eq("baby_id", baby.id)
      .gte("created_at", fbFrom.toISOString());

    let feedbackSummary: string | null = null;
    if (feedbackData && feedbackData.length > 0) {
      const up = feedbackData.filter((f) => f.vote === "up").length;
      const total = feedbackData.length;
      feedbackSummary = `Nas últimas 3 semanas, os pais marcaram ${up} de ${total} sugestões de soneca como úteis. ${
        up / total < 0.5
          ? "Eles têm discordado com frequência — seja mais cauteloso e explique melhor o raciocínio."
          : "Eles têm concordado na maioria — mantenha a abordagem."
      }`;
    }

    const context = buildSleepContext(
      baby,
      (sessionsData ?? []) as SleepSession[],
      "America/Sao_Paulo",
      feedbackSummary
    );
    const systemPrompt = getSleepSystemPrompt(context);

    const stream = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...parsed.data.messages,
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) {
              const data = JSON.stringify({ text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
