import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getFamilyForBaby,
  getFamilyMembers,
  getUserRoleForBaby,
  removeFamilyMember,
  updateMemberRole,
} from "@/lib/supabase/queries";

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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, currentUserRole: role });
}

// PATCH /api/family/members — update member role
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { babyId, targetUserId, role } = body as {
    babyId: string;
    targetUserId: string;
    role: "caregiver" | "viewer";
  };

  const userRole = await getUserRoleForBaby(supabase, user.id, babyId);
  if (userRole !== "owner") {
    return NextResponse.json({ error: "Only owners can change roles" }, { status: 403 });
  }

  const { data: family } = await getFamilyForBaby(supabase, babyId);
  if (!family) return NextResponse.json({ error: "Family not found" }, { status: 404 });

  const { error } = await updateMemberRole(supabase, family.id, targetUserId, role);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE /api/family/members?babyId=...&userId=... — remove member
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const babyId = req.nextUrl.searchParams.get("babyId");
  const targetUserId = req.nextUrl.searchParams.get("userId");

  if (!babyId || !targetUserId) {
    return NextResponse.json({ error: "babyId and userId required" }, { status: 400 });
  }

  // Allow self-removal or owner removing others
  const userRole = await getUserRoleForBaby(supabase, user.id, babyId);
  if (user.id !== targetUserId && userRole !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: family } = await getFamilyForBaby(supabase, babyId);
  if (!family) return NextResponse.json({ error: "Family not found" }, { status: 404 });

  const { error } = await removeFamilyMember(supabase, family.id, targetUserId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
