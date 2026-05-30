import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getFamilyForBaby,
  getUserProfile,
  getUserRoleForBaby,
  insertSleepActivityLog,
} from "@/lib/supabase/queries";
import { getActorDisplayLabel } from "@/lib/family/relations";
import { notifyFamilySleepActivity } from "@/lib/notifications/familyActivity";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { babyId, action, sleepSessionId, sleepType, babyName } = body as {
    babyId: string;
    action: "started" | "stopped";
    sleepSessionId?: string;
    sleepType: "NAP" | "NIGHT_SLEEP";
    babyName: string;
  };

  if (!babyId || !action || !sleepType || !babyName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (action !== "started" && action !== "stopped") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const role = await getUserRoleForBaby(supabase, user.id, babyId);
  if (!role || role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: family } = await getFamilyForBaby(supabase, babyId);

  const { data: profile } = await getUserProfile(supabase, user.id);

  const { data: memberRow } = family
    ? await supabase
        .from("family_members")
        .select("display_name, family_relation, email")
        .eq("family_id", family.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const familyRelation =
    memberRow?.family_relation ??
    profile?.family_relation ??
    null;
  const displayName =
    profile?.display_name ??
    memberRow?.display_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    null;
  const email = memberRow?.email ?? user.email ?? null;

  const actorName = getActorDisplayLabel(familyRelation, displayName, email);

  const { data: logRow, error } = await insertSleepActivityLog(supabase, {
    baby_id: babyId,
    family_id: family?.id ?? null,
    actor_user_id: user.id,
    actor_name: actorName,
    actor_relation: familyRelation,
    action,
    sleep_session_id: sleepSessionId ?? null,
    sleep_type: sleepType,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pushSent = await notifyFamilySleepActivity({
    babyId,
    actorUserId: user.id,
    action,
    sleepType,
    babyName,
    actorName,
    actorRelation: familyRelation,
  });

  return NextResponse.json({ data: logRow, pushSent });
}
