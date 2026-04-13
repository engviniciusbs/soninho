import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserRoleForBaby } from "@/lib/supabase/queries";

const updateSchema = z.object({
  type: z.enum(["NAP", "NIGHT_SLEEP"]).optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().nullable().optional(),
  quality: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  room_temp_celsius: z.number().nullable().optional(),
  weather_condition: z.string().nullable().optional(),
  sleep_sack_type: z.string().nullable().optional(),
  sleep_sack_tog: z.number().nullable().optional(),
  clothing_description: z.string().nullable().optional(),
});

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function resolveRole(supabase: SupabaseClient, userId: string, sessionId: string) {
  const { data: session } = await supabase
    .from("sleep_sessions")
    .select("baby_id")
    .eq("id", sessionId)
    .single();
  if (!session) return null;
  return getUserRoleForBaby(supabase, userId, session.baby_id);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("sleep_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const role = await getUserRoleForBaby(supabase, user.id, data.baby_id);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await resolveRole(supabase, user.id, id);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (role === "viewer") return NextResponse.json({ error: "Viewers cannot edit sessions" }, { status: 403 });

  const { data, error } = await supabase
    .from("sleep_sessions")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await resolveRole(supabase, user.id, id);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (role === "viewer") return NextResponse.json({ error: "Viewers cannot delete sessions" }, { status: 403 });

  const { error } = await supabase
    .from("sleep_sessions")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
