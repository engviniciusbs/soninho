import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getLastSleepSession } from "@/lib/supabase/queries";
import { computeNapSuggestion } from "@/lib/sleep/computeNapSuggestion";
import type { Baby } from "@/types";

const requestSchema = z.object({
  babyId: z.string().uuid(),
  timezone: z.string().default("America/Sao_Paulo"),
});

/**
 * Nap window + suggested time use the same {@link getWakeWindowRange} table as
 * WakeWindowBadge — no LLM, so numbers never diverge from the dashboard.
 */
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

    const { data: lastSession } = await getLastSleepSession(supabase, baby.id);
    const lastEnd = lastSession?.end_time ?? null;

    const suggestion = computeNapSuggestion({
      birthDateIso: baby.birth_date,
      lastSleepEndIso: lastEnd,
      timezone: parsed.data.timezone,
    });

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("AI suggest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
