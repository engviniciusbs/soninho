import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getFamilyForBaby,
  getFamilyMembers,
  getUserRoleForBaby,
  getFamilyNotes,
  createFamilyNote,
  deleteFamilyNote,
} from "@/lib/supabase/queries";

// GET /api/family/notes?babyId=... — list notes + family context
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const babyId = req.nextUrl.searchParams.get("babyId");
  if (!babyId)
    return NextResponse.json({ error: "babyId required" }, { status: 400 });

  const role = await getUserRoleForBaby(supabase, user.id, babyId);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: family } = await getFamilyForBaby(supabase, babyId);
  if (!family) {
    return NextResponse.json({ data: [], memberCount: 1, currentUserRole: role });
  }

  const { data: members } = await getFamilyMembers(supabase, family.id);
  const { data: notes, error } = await getFamilyNotes(supabase, family.id, 10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: notes ?? [],
    memberCount: members?.length ?? 1,
    currentUserRole: role,
    currentUserId: user.id,
  });
}

// POST /api/family/notes — add a note
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { babyId, text } = body as { babyId?: string; text?: string };

  if (!babyId || !text || !text.trim()) {
    return NextResponse.json(
      { error: "babyId and text required" },
      { status: 400 }
    );
  }

  const role = await getUserRoleForBaby(supabase, user.id, babyId);
  if (!role || role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: family } = await getFamilyForBaby(supabase, babyId);
  if (!family)
    return NextResponse.json({ error: "Family not found" }, { status: 404 });

  // Resolve a friendly author name from the family membership.
  const { data: members } = await getFamilyMembers(supabase, family.id);
  const me = members?.find((m) => m.user_id === user.id);
  const authorName =
    me?.display_name ?? me?.email ?? user.email ?? "Membro da família";

  const { data, error } = await createFamilyNote(
    supabase,
    family.id,
    user.id,
    authorName,
    text.trim().slice(0, 500)
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

// DELETE /api/family/notes?noteId=... — remove a note (author or owner via RLS)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const noteId = req.nextUrl.searchParams.get("noteId");
  if (!noteId)
    return NextResponse.json({ error: "noteId required" }, { status: 400 });

  const { error } = await deleteFamilyNote(supabase, noteId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
