import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getSleepActivityLog,
  getUserRoleForBaby,
} from "@/lib/supabase/queries";
import { getFeedingActivityLog } from "@/lib/supabase/feedingQueries";

export interface UnifiedActivityItem {
  id: string;
  kind: "sleep" | "feeding";
  action: string;
  created_at: string;
  actor_name: string | null;
  actor_relation: string | null;
  sleep_type?: "NAP" | "NIGHT_SLEEP" | null;
  feeding_type?: "BOTTLE" | "BREAST" | "SOLID" | null;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const babyId = req.nextUrl.searchParams.get("babyId");
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "15");

  if (!babyId) {
    return NextResponse.json({ error: "babyId required" }, { status: 400 });
  }

  const role = await getUserRoleForBaby(supabase, user.id, babyId);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [sleepRes, feedingRes] = await Promise.all([
    getSleepActivityLog(supabase, babyId, limit),
    getFeedingActivityLog(supabase, babyId, limit),
  ]);

  if (sleepRes.error) {
    return NextResponse.json({ error: sleepRes.error.message }, { status: 500 });
  }
  if (feedingRes.error) {
    return NextResponse.json({ error: feedingRes.error.message }, { status: 500 });
  }

  const sleepItems: UnifiedActivityItem[] = (sleepRes.data ?? []).map((row) => ({
    id: row.id,
    kind: "sleep",
    action: row.action,
    created_at: row.created_at,
    actor_name: row.actor_name,
    actor_relation: row.actor_relation,
    sleep_type: row.sleep_type,
  }));

  const feedingItems: UnifiedActivityItem[] = (feedingRes.data ?? []).map((row) => ({
    id: row.id,
    kind: "feeding",
    action: row.action,
    created_at: row.created_at,
    actor_name: row.actor_name,
    actor_relation: row.actor_relation,
    feeding_type: row.feeding_type,
  }));

  const data = [...sleepItems, ...feedingItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

  return NextResponse.json({ data });
}
