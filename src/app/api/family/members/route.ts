import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getFamilyForBaby,
  getFamilyMembers,
  getUserRoleForBaby,
  removeFamilyMember,
  updateMemberRole,
} from "@/lib/supabase/queries";

const patchSchema = z.object({
  babyId: z.uuid(),
  targetUserId: z.uuid(),
  role: z.enum(["caregiver", "viewer"]),
});

const deleteSchema = z.object({
  babyId: z.uuid(),
  targetUserId: z.uuid(),
});

/** Maps a DB error to a generic client response (never exposes error.message). */
function dbErrorResponse(error: { message?: string; code?: string }) {
  const msg = error.message ?? "";
  if (msg.includes("family_needs_owner")) {
    return NextResponse.json(
      { error: "A família precisa de pelo menos um responsável" },
      { status: 409 }
    );
  }
  if (msg.includes("forbidden_role_change") || error.code === "42501") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

// GET /api/family/members?babyId=... — list family members
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const babyId = req.nextUrl.searchParams.get("babyId");
  if (!babyId) return NextResponse.json({ error: "babyId required" }, { status: 400 });

  const role = await getUserRoleForBaby(supabase, user.id, babyId);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: family } = await getFamilyForBaby(supabase, babyId);
  if (!family) return NextResponse.json({ data: [] });

  const { data, error } = await getFamilyMembers(supabase, family.id);
  if (error) return NextResponse.json({ error: "Internal error" }, { status: 500 });

  return NextResponse.json({ data, currentUserRole: role });
}

// PATCH /api/family/members — update member role
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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
    return NextResponse.json({ error: "Only owners can change roles" }, { status: 403 });
  }

  const { data: family } = await getFamilyForBaby(supabase, babyId);
  if (!family) return NextResponse.json({ error: "Family not found" }, { status: 404 });

  const { error } = await updateMemberRole(supabase, family.id, targetUserId, role);
  if (error) return dbErrorResponse(error);

  return NextResponse.json({ success: true });
}

// DELETE /api/family/members?babyId=...&userId=... — remove member
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Accepts targetUserId (preferred) or legacy userId query param.
  const sp = req.nextUrl.searchParams;
  const parsed = deleteSchema.safeParse({
    babyId: sp.get("babyId"),
    targetUserId: sp.get("targetUserId") ?? sp.get("userId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { babyId, targetUserId } = parsed.data;

  // Allow self-removal or owner removing others
  const userRole = await getUserRoleForBaby(supabase, user.id, babyId);
  if (user.id !== targetUserId && userRole !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: family } = await getFamilyForBaby(supabase, babyId);
  if (!family) return NextResponse.json({ error: "Family not found" }, { status: 404 });

  const { error } = await removeFamilyMember(supabase, family.id, targetUserId);
  if (error) return dbErrorResponse(error);

  return NextResponse.json({ success: true });
}
