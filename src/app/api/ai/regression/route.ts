import { NextResponse } from "next/server";
import { z } from "zod";
import { zTimeZone, zUuid } from "@/lib/validation/common";
import { differenceInWeeks, differenceInMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getRecentSessions } from "@/lib/supabase/queries/sleep";
import { getUserRoleForBaby } from "@/lib/supabase/queries/family";
import { tryConsumeAiQuota } from "@/lib/ai/quota";
import { openai, OPENAI_MODEL } from "@/lib/ai/openai";
import { detectRegression, computeSleepDebt } from "@/lib/sleep/regression";
import { getAgeSchedule } from "@/lib/sleep/schedules";
import { buildRegressionMessages } from "@/lib/ai/regressionPrompt";
import { toBabySex } from "@/lib/i18n/gender";
import type { Baby, SleepSession } from "@/types";
import { parseLocalDate } from "@/lib/dates/localDate";

const requestSchema = z.object({
  babyId: zUuid,
  timezone: zTimeZone,
  // The client asks for the LLM explanation at most once per baby per day.
  withAi: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const role = await getUserRoleForBaby(supabase, user.id, parsed.data.babyId);
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
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

    // Days are the family's local days (the server runs in UTC): today, still
    // running, is left out, and a sleep in progress counts up to now.
    const now = new Date();
    const days = { timeZone: parsed.data.timezone, now };
    const ageWeeks = differenceInWeeks(now, parseLocalDate(baby.birth_date));
    const ageMonths = differenceInMonths(now, parseLocalDate(baby.birth_date));
    const regression = detectRegression(baby.birth_date, sessions, 5, days);
    const debt = computeSleepDebt(sessions, ageWeeks, 7, days);
    const schedule = getAgeSchedule(ageWeeks);

    const base = {
      detected: regression.detected,
      ageWindow: regression.ageWindow?.label ?? null,
      summary: regression.summary,
      debtHours: debt.debtHours,
      sleepDropHours: regression.sleepDropHours,
    };

    // Only spend an LLM call when there is something to explain.
    if (!regression.detected || !parsed.data.withAi) {
      return NextResponse.json({
        ...base,
        explanation: null,
        tips: [],
      });
    }

    // Quota exhausted or quota RPC failing: still render the deterministic result, without AI text.
    if (!(await tryConsumeAiQuota(supabase))) {
      return NextResponse.json({ ...base, explanation: null, tips: [] });
    }

    const messages = buildRegressionMessages({
      ageWeeks,
      ageMonths,
      sex: toBabySex(baby.sex),
      ageWindowLabel: regression.ageWindow?.label ?? null,
      sleepDropHours: regression.sleepDropHours,
      wakeIncrease: regression.wakeIncrease,
      targetHours: schedule.totalSleepHours,
      avgHours: debt.avgHours,
    });

    let explanation: string | null = null;
    let tips: string[] = [];
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0,
        seed: 42,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages,
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
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
    } catch (aiError) {
      console.error("AI regression OpenAI error:", aiError);
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
