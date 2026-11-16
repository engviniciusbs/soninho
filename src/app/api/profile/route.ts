import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbErrorToResponse } from "@/lib/http/errors";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile, upsertUserProfile } from "@/lib/supabase/queries/profile";
import { updateMemberFamilyRelation } from "@/lib/supabase/queries/family";

const patchSchema = z.object({
  display_name: z.string().max(100).nullish(),
  family_relation: z.string().max(50).nullish(),
  ui_mode: z.enum(["standard", "nanny"]).optional(),
  syncFamilyMembers: z.boolean().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await getUserProfile(supabase, user.id);
  if (error) {
    return dbErrorToResponse(error);
  }

  return NextResponse.json({
    data: data ?? {
      user_id: user.id,
      display_name:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        null,
      family_relation: null,
      ui_mode: "standard" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }
  const { display_name, family_relation, ui_mode, syncFamilyMembers } = parsed.data;

  const { data, error } = await upsertUserProfile(supabase, user.id, {
    display_name,
    family_relation,
    ui_mode,
  });

  if (error) {
    return dbErrorToResponse(error);
  }

  if (syncFamilyMembers && family_relation !== undefined) {
    const { data: memberships } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", user.id);

    for (const m of memberships ?? []) {
      await updateMemberFamilyRelation(
        supabase,
        m.family_id,
        user.id,
        family_relation
      );
      await supabase
        .from("family_members")
        .update({ display_name: display_name ?? undefined })
        .eq("family_id", m.family_id)
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({ data });
}
