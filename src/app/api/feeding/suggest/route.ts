import { NextResponse } from "next/server";
import { z } from "zod";
import { zTimeZone, zUuid } from "@/lib/validation/common";
import { differenceInWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getUserRoleForBaby } from "@/lib/supabase/queries/family";
import { getRecentMilkFeedTimes } from "@/lib/supabase/feedingQueries";
import { computeFeedingSuggestion } from "@/lib/feeding/computeFeedingSuggestion";
import type { Baby } from "@/types";

const requestSchema = z.object({
  babyId: zUuid,
  timezone: zTimeZone,
});

/**
 * Next-feed suggestion (bottle or breast) from the average interval between
 * recent milk feeds. Deterministic — no LLM, mirrors /api/ai/suggest.
 */
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

    const recentFeedTimes = await getRecentMilkFeedTimes(supabase, baby.id, 8);
    const ageWeeks = differenceInWeeks(new Date(), new Date(baby.birth_date));

    const suggestion = computeFeedingSuggestion({
      ageWeeks,
      recentFeedTimes,
      timezone: parsed.data.timezone,
    });

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("Feeding suggest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
