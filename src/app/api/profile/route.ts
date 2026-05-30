import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getUserProfile,
  upsertUserProfile,
  updateMemberFamilyRelation,
} from "@/lib/supabase/queries";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await getUserProfile(supabase, user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  const body = await req.json();
  const {
    display_name,
    family_relation,
    ui_mode,
    syncFamilyMembers,
  } = body as {
    display_name?: string | null;
    family_relation?: string | null;
    ui_mode?: "standard" | "nanny";
    syncFamilyMembers?: boolean;
  };

  if (ui_mode && ui_mode !== "standard" && ui_mode !== "nanny") {
    return NextResponse.json({ error: "Invalid ui_mode" }, { status: 400 });
  }

  const { data, error } = await upsertUserProfile(supabase, user.id, {
    display_name,
    family_relation,
    ui_mode,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
