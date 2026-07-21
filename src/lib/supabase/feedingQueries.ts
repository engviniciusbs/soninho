import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BottleFeeding,
  BreastfeedingSession,
  SolidFeeding,
  MilkType,
  BreastSide,
  FoodReaction,
  FeedingTimelineItem,
} from "@/types";

type Client = SupabaseClient;

/* ─── Bottle feedings (quick log, no timer) ─────────────────────────────── */

export async function logBottleFeeding(
  supabase: Client,
  babyId: string,
  data: {
    volume_ml: number;
    milk_type: MilkType;
    start_time?: string;
    notes?: string | null;
  }
) {
  return supabase
    .from("bottle_feedings")
    .insert({
      baby_id: babyId,
      volume_ml: data.volume_ml,
      milk_type: data.milk_type,
      start_time: data.start_time ?? new Date().toISOString(),
      notes: data.notes ?? null,
    })
    .select()
    .single();
}

export async function updateBottleFeeding(
  supabase: Client,
  id: string,
  data: Partial<{
    volume_ml: number;
    milk_type: MilkType;
    start_time: string;
    notes: string | null;
  }>
) {
  return supabase.from("bottle_feedings").update(data).eq("id", id).select().single();
}

export async function deleteBottleFeeding(supabase: Client, id: string) {
  return supabase.from("bottle_feedings").delete().eq("id", id);
}

export async function getBottleFeedings(
  supabase: Client,
  babyId: string,
  from: Date,
  to: Date
) {
  return supabase
    .from("bottle_feedings")
    .select("*")
    .eq("baby_id", babyId)
    .gte("start_time", from.toISOString())
    .lte("start_time", to.toISOString())
    .order("start_time", { ascending: false });
}

/* ─── Breastfeeding sessions (live timer, dual side) ────────────────────── */

export async function getActiveBreastfeedingSession(
  supabase: Client,
  babyId: string
) {
  return supabase
    .from("breastfeeding_sessions")
    .select("*")
    .eq("baby_id", babyId)
    .is("end_time", null)
    .maybeSingle();
}

export async function startBreastfeedingSession(
  supabase: Client,
  babyId: string,
  side: BreastSide,
  startTimeIso?: string
) {
  return supabase
    .from("breastfeeding_sessions")
    .insert({
      baby_id: babyId,
      start_time: startTimeIso ?? new Date().toISOString(),
      last_side: side,
    })
    .select()
    .single();
}

export async function updateBreastfeedingSides(
  supabase: Client,
  id: string,
  data: { side_left_sec: number; side_right_sec: number; last_side: BreastSide }
) {
  return supabase
    .from("breastfeeding_sessions")
    .update(data)
    .eq("id", id)
    .select()
    .single();
}

export async function endBreastfeedingSession(
  supabase: Client,
  id: string,
  data: { side_left_sec: number; side_right_sec: number; notes?: string | null }
) {
  return supabase
    .from("breastfeeding_sessions")
    .update({
      end_time: new Date().toISOString(),
      side_left_sec: data.side_left_sec,
      side_right_sec: data.side_right_sec,
      notes: data.notes ?? null,
    })
    .eq("id", id)
    .select()
    .single();
}

/** Full manual edit (as opposed to the live-timer-only {@link updateBreastfeedingSides}). */
export async function updateBreastfeedingSession(
  supabase: Client,
  id: string,
  data: Partial<{
    start_time: string;
    end_time: string | null;
    side_left_sec: number;
    side_right_sec: number;
    last_side: BreastSide | null;
    notes: string | null;
  }>
) {
  return supabase
    .from("breastfeeding_sessions")
    .update(data)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteBreastfeedingSession(supabase: Client, id: string) {
  return supabase.from("breastfeeding_sessions").delete().eq("id", id);
}

export async function getBreastfeedingSessions(
  supabase: Client,
  babyId: string,
  from: Date,
  to: Date
) {
  return supabase
    .from("breastfeeding_sessions")
    .select("*")
    .eq("baby_id", babyId)
    .gte("start_time", from.toISOString())
    .lte("start_time", to.toISOString())
    .order("start_time", { ascending: false });
}

/* ─── Solid feedings (food tags + reaction) ─────────────────────────────── */

export async function logSolidFeeding(
  supabase: Client,
  babyId: string,
  data: {
    food_tags: string[];
    reaction?: FoodReaction | null;
    start_time?: string;
    notes?: string | null;
  }
) {
  return supabase
    .from("solid_feedings")
    .insert({
      baby_id: babyId,
      food_tags: data.food_tags,
      reaction: data.reaction ?? null,
      start_time: data.start_time ?? new Date().toISOString(),
      notes: data.notes ?? null,
    })
    .select()
    .single();
}

export async function updateSolidFeeding(
  supabase: Client,
  id: string,
  data: Partial<{
    start_time: string;
    food_tags: string[];
    reaction: FoodReaction | null;
    notes: string | null;
  }>
) {
  return supabase.from("solid_feedings").update(data).eq("id", id).select().single();
}

export async function deleteSolidFeeding(supabase: Client, id: string) {
  return supabase.from("solid_feedings").delete().eq("id", id);
}

export async function getSolidFeedings(
  supabase: Client,
  babyId: string,
  from: Date,
  to: Date
) {
  return supabase
    .from("solid_feedings")
    .select("*")
    .eq("baby_id", babyId)
    .gte("start_time", from.toISOString())
    .lte("start_time", to.toISOString())
    .order("start_time", { ascending: false });
}

/* ─── Family activity log (feeding) ──────────────────────────────────────── */

export async function getFeedingActivityLog(
  supabase: Client,
  babyId: string,
  limit: number = 15
) {
  return supabase
    .from("feeding_activity_log")
    .select("*")
    .eq("baby_id", babyId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function insertFeedingActivityLog(
  supabase: Client,
  row: {
    baby_id: string;
    family_id?: string | null;
    actor_user_id: string;
    actor_name?: string | null;
    actor_relation?: string | null;
    action: "started" | "stopped" | "logged";
    feeding_type: "BOTTLE" | "BREAST" | "SOLID";
    reference_id?: string | null;
  }
) {
  return supabase.from("feeding_activity_log").insert(row).select().single();
}

/* ─── Unified timeline (aggregates the 3 tables) ────────────────────────── */

function bottleSummary(f: BottleFeeding): string {
  const type =
    f.milk_type === "FORMULA"
      ? "fórmula"
      : f.milk_type === "BREAST_MILK"
        ? "leite ordenhado"
        : "misto";
  return `${f.volume_ml}ml · ${type}`;
}

function breastSummary(f: BreastfeedingSession): string {
  const totalMin = Math.round((f.side_left_sec + f.side_right_sec) / 60);
  const sides = [
    f.side_left_sec > 0 ? "E" : null,
    f.side_right_sec > 0 ? "D" : null,
  ].filter(Boolean);
  return `${totalMin}min${sides.length ? ` (${sides.join("/")})` : ""}`;
}

function solidSummary(f: SolidFeeding): string {
  if (f.food_tags.length === 0) return "Refeição de sólidos";
  return f.food_tags.slice(0, 3).join(", ") + (f.food_tags.length > 3 ? "…" : "");
}

export async function getFeedingTimeline(
  supabase: Client,
  babyId: string,
  from: Date,
  to: Date
): Promise<{ data: FeedingTimelineItem[]; error: Error | null }> {
  const [bottleRes, breastRes, solidRes] = await Promise.all([
    getBottleFeedings(supabase, babyId, from, to),
    getBreastfeedingSessions(supabase, babyId, from, to),
    getSolidFeedings(supabase, babyId, from, to),
  ]);

  const error = bottleRes.error ?? breastRes.error ?? solidRes.error ?? null;

  const bottleItems: FeedingTimelineItem[] = (bottleRes.data ?? []).map((f) => ({
    id: f.id,
    type: "BOTTLE",
    startTime: f.start_time,
    endTime: f.start_time,
    summary: bottleSummary(f),
    raw: f,
  }));

  const breastItems: FeedingTimelineItem[] = (breastRes.data ?? []).map((f) => ({
    id: f.id,
    type: "BREAST",
    startTime: f.start_time,
    endTime: f.end_time,
    summary: breastSummary(f),
    raw: f,
  }));

  const solidItems: FeedingTimelineItem[] = (solidRes.data ?? []).map((f) => ({
    id: f.id,
    type: "SOLID",
    startTime: f.start_time,
    endTime: f.start_time,
    summary: solidSummary(f),
    raw: f,
  }));

  const merged = [...bottleItems, ...breastItems, ...solidItems].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  return { data: merged, error };
}

export async function getRecentFeedingTimeline(
  supabase: Client,
  babyId: string,
  days: number = 3
) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  return getFeedingTimeline(supabase, babyId, from, new Date());
}

/** Milk feed end times (bottle + breastfeeding), most recent first — anchor for the next-feed prediction. */
export async function getRecentMilkFeedTimes(
  supabase: Client,
  babyId: string,
  limit: number = 8
): Promise<string[]> {
  const from = new Date();
  from.setDate(from.getDate() - 4);

  const [bottleRes, breastRes] = await Promise.all([
    supabase
      .from("bottle_feedings")
      .select("start_time")
      .eq("baby_id", babyId)
      .gte("start_time", from.toISOString())
      .order("start_time", { ascending: false })
      .limit(limit),
    supabase
      .from("breastfeeding_sessions")
      .select("start_time, end_time")
      .eq("baby_id", babyId)
      .not("end_time", "is", null)
      .gte("start_time", from.toISOString())
      .order("start_time", { ascending: false })
      .limit(limit),
  ]);

  const times: string[] = [
    ...((bottleRes.data ?? []) as { start_time: string }[]).map((r) => r.start_time),
    ...((breastRes.data ?? []) as { start_time: string; end_time: string | null }[]).map(
      (r) => r.end_time ?? r.start_time
    ),
  ];

  return times
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .slice(0, limit);
}
