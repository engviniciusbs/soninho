import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dbErrorToResponse } from "@/lib/http/errors";
import {
  createFamilyInvite,
  getActiveFamilyInvites,
  getFamilyForBaby,
  getUserRoleForBaby,
  revokeFamilyInvite,
} from "@/lib/supabase/queries";

const postSchema = z.object({
  babyId: z.string().uuid(),
  role: z.enum(["caregiver", "viewer"]),
  familyRelation: z.string().max(40).nullish(),
});

// GET  /api/family/invite?babyId=... — list active invites for baby's family
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const babyId = req.nextUrl.searchParams.get("babyId");
  if (!babyId) return NextResponse.json({ error: "babyId required" }, { status: 400 });

  const role = await getUserRoleForBaby(supabase, user.id, babyId);
  if (role !== "owner") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { data: family } = await getFamilyForBaby(supabase, babyId);
  if (!family) return NextResponse.json({ data: [] });

  const { data, error } = await getActiveFamilyInvites(supabase, family.id);
  if (error) return dbErrorToResponse(error);

  return NextResponse.json({ data });
}

// POST /api/family/invite — create a new invite link
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }
  const { babyId, role, familyRelation } = parsed.data;

  const userRole = await getUserRoleForBaby(supabase, user.id, babyId);
  if (userRole !== "owner") {
    return NextResponse.json({ error: "Apenas responsáveis podem criar convites" }, { status: 403 });
  }

  const { data: family } = await getFamilyForBaby(supabase, babyId);
  if (!family) return NextResponse.json({ error: "Família não encontrada" }, { status: 404 });

  const { data, error } = await createFamilyInvite(
    supabase,
    family.id,
    user.id,
    role,
    familyRelation ?? null
  );
  if (error) return dbErrorToResponse(error);

  return NextResponse.json({ data });
}

// DELETE /api/family/invite?inviteId=... — revoke invite
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const inviteId = req.nextUrl.searchParams.get("inviteId");
  const babyId = req.nextUrl.searchParams.get("babyId");
  if (!inviteId || !babyId) {
    return NextResponse.json({ error: "inviteId and babyId required" }, { status: 400 });
  }

  const role = await getUserRoleForBaby(supabase, user.id, babyId);
  if (role !== "owner") {
    return NextResponse.json({ error: "Apenas responsáveis podem revogar convites" }, { status: 403 });
  }

  const { data: family } = await getFamilyForBaby(supabase, babyId);
  if (!family) return NextResponse.json({ error: "Família não encontrada" }, { status: 404 });

  const { data: revoked, error } = await revokeFamilyInvite(supabase, inviteId, family.id);
  if (error) return dbErrorToResponse(error);
  if (!revoked || revoked.length === 0) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
