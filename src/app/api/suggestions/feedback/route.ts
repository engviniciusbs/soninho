import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  babyId: z.string().uuid(),
  vote: z.enum(["up", "down"]),
  suggestedTime: z.string().nullable().optional(),
  windowStart: z.string().nullable().optional(),
  windowEnd: z.string().nullable().optional(),
  ageWeeks: z.number().int().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase.from("nap_suggestion_feedback").insert({
      baby_id: parsed.data.babyId,
      user_id: user.id,
      vote: parsed.data.vote,
      suggested_time: parsed.data.suggestedTime ?? null,
      window_start: parsed.data.windowStart ?? null,
      window_end: parsed.data.windowEnd ?? null,
      age_weeks: parsed.data.ageWeeks ?? null,
    });

    if (error) {
      console.error("Feedback insert error:", error);
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Suggestion feedback error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
