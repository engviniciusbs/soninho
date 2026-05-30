import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getSleepActivityLog,
  getUserRoleForBaby,
} from "@/lib/supabase/queries";

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

  const { data, error } = await getSleepActivityLog(supabase, babyId, limit);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
