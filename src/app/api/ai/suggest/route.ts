import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getLastSleepSession, getRecentSessions } from "@/lib/supabase/queries";
import { computeNapSuggestion } from "@/lib/sleep/computeNapSuggestion";
import type { Baby, SleepSession } from "@/types";

const requestSchema = z.object({
  babyId: z.string().uuid(),
  timezone: z.string().default("America/Sao_Paulo"),
});

/**
 * Next-sleep suggestion (nap vs. night) using wake-window math plus schedule/history.
 * Same {@link getWakeWindowRange} table as WakeWindowBadge — no LLM drift.
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

    const { data: recentData } = await getRecentSessions(supabase, baby.id, 14);
    const recentSessions = (recentData ?? []) as SleepSession[];

    const suggestion = computeNapSuggestion({
      birthDateIso: baby.birth_date,
      lastSleepEndIso: lastEnd,
      lastSessionType: lastSession?.type ?? null,
      recentSessions,
      timezone: parsed.data.timezone,
    });

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("AI suggest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
