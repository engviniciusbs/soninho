import { NextResponse } from "next/server";
import { z } from "zod";
import { dbErrorToResponse } from "@/lib/http/errors";
import { zUuid } from "@/lib/validation/common";
import { createClient } from "@/lib/supabase/server";
import { getUserRoleForBaby } from "@/lib/supabase/queries/family";

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
}).refine(
  (v) => !v.end_time || !v.start_time || new Date(v.end_time).getTime() >= new Date(v.start_time).getTime(),
  { message: "O fim não pode ser antes do início", path: ["end_time"] }
);

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
  const { id: rawId } = await params;
  const idParsed = zUuid.safeParse(rawId);
  if (!idParsed.success) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const id = idParsed.data;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("sleep_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("sleep GET error:", error);
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
  }

  const role = await getUserRoleForBaby(supabase, user.id, data.baby_id);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const idParsed = zUuid.safeParse(rawId);
  if (!idParsed.success) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const id = idParsed.data;
  const supabase = await createClient();
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
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
    return dbErrorToResponse(error);
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const idParsed = zUuid.safeParse(rawId);
  if (!idParsed.success) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const id = idParsed.data;
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
    return dbErrorToResponse(error);
  }

  return NextResponse.json({ success: true });
}
