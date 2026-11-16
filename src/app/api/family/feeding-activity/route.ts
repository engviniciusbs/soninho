import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbErrorToResponse } from "@/lib/http/errors";
import { createClient } from "@/lib/supabase/server";
import { getFamilyForBaby, getUserRoleForBaby } from "@/lib/supabase/queries/family";
import { getUserProfile } from "@/lib/supabase/queries/profile";
import { insertFeedingActivityLog } from "@/lib/supabase/feedingQueries";
import { getActorDisplayLabel } from "@/lib/family/relations";
import { notifyFamilyFeedingActivity } from "@/lib/notifications/familyActivity";
import { zUuid } from "@/lib/validation/common";

const bodySchema = z.object({
  babyId: zUuid,
  action: z.enum(["started", "stopped", "logged"]),
  feedingType: z.enum(["BOTTLE", "BREAST", "SOLID"]),
  referenceId: zUuid.nullish(),
  babyName: z.string().optional(), // ignored: name is read server-side
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }
  const { babyId, action, feedingType, referenceId } = parsed.data;

  const role = await getUserRoleForBaby(supabase, user.id, babyId);
  if (!role || role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: babyRow } = await supabase
    .from("babies")
    .select("name")
    .eq("id", babyId)
    .maybeSingle();
  const babyName = babyRow?.name ?? "o bebê";

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
    memberRow?.family_relation ?? profile?.family_relation ?? null;
  const displayName =
    profile?.display_name ??
    memberRow?.display_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    null;
  const email = memberRow?.email ?? user.email ?? null;

  const actorName = getActorDisplayLabel(familyRelation, displayName, email);

  const { data: logRow, error } = await insertFeedingActivityLog(supabase, {
    baby_id: babyId,
    family_id: family?.id ?? null,
    actor_user_id: user.id,
    actor_name: actorName,
    actor_relation: familyRelation,
    action,
    feeding_type: feedingType,
    reference_id: referenceId ?? null,
  });

  if (error) {
    return dbErrorToResponse(error);
  }

  const pushSent = await notifyFamilyFeedingActivity({
    babyId,
    actorUserId: user.id,
    action,
    feedingType,
    babyName,
    actorName,
    actorRelation: familyRelation,
  });

  return NextResponse.json({ data: logRow, pushSent });
}
