import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createFamilyInvite,
  getActiveFamilyInvites,
  getFamilyForBaby,
  getUserRoleForBaby,
  revokeFamilyInvite,
} from "@/lib/supabase/queries";

// GET  /api/family/invite?babyId=... — list active invites for baby's family
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

  const { data, error } = await getActiveFamilyInvites(supabase, family.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

// POST /api/family/invite — create a new invite link
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { babyId, role, familyRelation } = body as {
    babyId: string;
    role: "caregiver" | "viewer";
    familyRelation?: string | null;
  };

  if (!babyId || !role) {
    return NextResponse.json({ error: "babyId and role required" }, { status: 400 });
  }

  const userRole = await getUserRoleForBaby(supabase, user.id, babyId);
  if (userRole !== "owner") {
    return NextResponse.json({ error: "Only owners can create invites" }, { status: 403 });
  }

  const { data: family } = await getFamilyForBaby(supabase, babyId);
  if (!family) return NextResponse.json({ error: "Family not found" }, { status: 404 });

  const { data, error } = await createFamilyInvite(
    supabase,
    family.id,
    user.id,
    role,
    familyRelation ?? null
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

// DELETE /api/family/invite?inviteId=... — revoke invite
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const inviteId = req.nextUrl.searchParams.get("inviteId");
  const babyId = req.nextUrl.searchParams.get("babyId");
  if (!inviteId || !babyId) {
    return NextResponse.json({ error: "inviteId and babyId required" }, { status: 400 });
  }

  const role = await getUserRoleForBaby(supabase, user.id, babyId);
  if (role !== "owner") {
    return NextResponse.json({ error: "Only owners can revoke invites" }, { status: 403 });
  }

  const { error } = await revokeFamilyInvite(supabase, inviteId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
