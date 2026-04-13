import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserRoleForBaby } from "@/lib/supabase/queries";

const createSchema = z.object({
  baby_id: z.string().uuid(),
  type: z.enum(["NAP", "NIGHT_SLEEP"]),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().nullable().optional(),
  quality: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const babyId = searchParams.get("baby_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!babyId) {
    return NextResponse.json({ error: "baby_id is required" }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getUserRoleForBaby(supabase, user.id, babyId);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let query = supabase
    .from("sleep_sessions")
    .select("*")
    .eq("baby_id", babyId)
    .order("start_time", { ascending: false });

  if (from) query = query.gte("start_time", from);
  if (to) query = query.lte("start_time", to);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getUserRoleForBaby(supabase, user.id, parsed.data.baby_id);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (role === "viewer") return NextResponse.json({ error: "Viewers cannot create sleep sessions" }, { status: 403 });

  const { data, error } = await supabase
    .from("sleep_sessions")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
