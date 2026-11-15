import { NextResponse } from "next/server";
import { dbErrorToResponse } from "@/lib/http/errors";
import { zUuid } from "@/lib/validation/common";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isUniqueViolation } from "@/lib/supabase/sessionConflict";
import { getUserRoleForBaby } from "@/lib/supabase/queries";

const createSchema = z.object({
  baby_id: z.string().uuid(),
  type: z.enum(["NAP", "NIGHT_SLEEP"]),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().nullable().optional(),
  quality: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
}).refine(
  (v) => !v.end_time || new Date(v.end_time).getTime() >= new Date(v.start_time).getTime(),
  { message: "O fim não pode ser antes do início", path: ["end_time"] }
);

const querySchema = z.object({
  baby_id: zUuid,
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const q = querySchema.safeParse({
    baby_id: searchParams.get("baby_id"),
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  if (!q.success) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }
  const { baby_id: babyId, from, to } = q.data;

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
    return dbErrorToResponse(error);
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const parsed = createSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
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
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "Já existe um sono em andamento" }, { status: 409 });
    }
    return dbErrorToResponse(error);
  }

  return NextResponse.json(data, { status: 201 });
}
