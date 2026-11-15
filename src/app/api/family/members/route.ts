import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { zUuid } from "@/lib/validation/common";
import { dbErrorToResponse } from "@/lib/http/errors";
import {
  getFamilyForBaby,
  getFamilyMembers,
  getUserRoleForBaby,
  removeFamilyMember,
  updateMemberRole,
} from "@/lib/supabase/queries";

const patchSchema = z.object({
  babyId: zUuid,
  targetUserId: zUuid,
  role: z.enum(["caregiver", "viewer"]),
});

const deleteSchema = z.object({
  babyId: zUuid,
  targetUserId: zUuid,
});

// GET /api/family/members?babyId=... — list family members
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const babyId = req.nextUrl.searchParams.get("babyId");
  if (!babyId) return NextResponse.json({ error: "babyId obrigatório" }, { status: 400 });

  const role = await getUserRoleForBaby(supabase, user.id, babyId);
  if (!role) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { data: family } = await getFamilyForBaby(supabase, babyId);
  if (!family) return NextResponse.json({ data: [] });

  const { data, error } = await getFamilyMembers(supabase, family.id);
  if (error) return dbErrorToResponse(error);

  return NextResponse.json({ data, currentUserRole: role });
}

// PATCH /api/family/members — update member role
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }
  const { babyId, targetUserId, role } = parsed.data;

  if (targetUserId === user.id) {
    return NextResponse.json(
      { error: "Você não pode alterar o próprio papel" },
      { status: 400 }
    );
  }

  const userRole = await getUserRoleForBaby(supabase, user.id, babyId);
  if (userRole !== "owner") {
    return NextResponse.json({ error: "Apenas responsáveis podem alterar papéis" }, { status: 403 });
  }

  const { data: family } = await getFamilyForBaby(supabase, babyId);
  if (!family) return NextResponse.json({ error: "Família não encontrada" }, { status: 404 });

  const { data: updated, error } = await updateMemberRole(supabase, family.id, targetUserId, role);
  if (error) return dbErrorToResponse(error);
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/family/members?babyId=...&userId=... — remove member
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Accepts targetUserId (preferred) or legacy userId query param.
  const sp = req.nextUrl.searchParams;
  const parsed = deleteSchema.safeParse({
    babyId: sp.get("babyId"),
    targetUserId: sp.get("targetUserId") ?? sp.get("userId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }
  const { babyId, targetUserId } = parsed.data;

  // Allow self-removal or owner removing others
  const userRole = await getUserRoleForBaby(supabase, user.id, babyId);
  if (user.id !== targetUserId && userRole !== "owner") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { data: family } = await getFamilyForBaby(supabase, babyId);
  if (!family) return NextResponse.json({ error: "Família não encontrada" }, { status: 404 });

  // Defense in depth: the DB trigger also enforces this.
  const { data: members, error: membersError } = await getFamilyMembers(supabase, family.id);
  if (membersError) return dbErrorToResponse(membersError);
  const target = members?.find((m) => m.user_id === targetUserId);
  if (!target) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (
    target.role === "owner" &&
    members.filter((m) => m.role === "owner").length <= 1
  ) {
    return NextResponse.json(
      { error: "A família precisa de pelo menos um responsável" },
      { status: 409 }
    );
  }

  const { data: removed, error } = await removeFamilyMember(supabase, family.id, targetUserId);
  if (error) return dbErrorToResponse(error);
  if (!removed || removed.length === 0) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
