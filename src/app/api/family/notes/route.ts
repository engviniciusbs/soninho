import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbErrorToResponse } from "@/lib/http/errors";
import { zUuid } from "@/lib/validation/common";
import { createClient } from "@/lib/supabase/server";
import { getFamilyForBaby, getFamilyMembers, getUserRoleForBaby, getFamilyNotes, createFamilyNote, deleteFamilyNote } from "@/lib/supabase/queries/family";

const postSchema = z.object({
  babyId: zUuid,
  text: z.string().trim().min(1).transform((t) => t.slice(0, 500)),
});

// GET /api/family/notes?babyId=... — list notes + family context
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsedBaby = zUuid.safeParse(req.nextUrl.searchParams.get("babyId"));
  if (!parsedBaby.success)
    return NextResponse.json({ error: "babyId inválido" }, { status: 400 });
  const babyId = parsedBaby.data;

  const role = await getUserRoleForBaby(supabase, user.id, babyId);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: family } = await getFamilyForBaby(supabase, babyId);
  if (!family) {
    return NextResponse.json({ data: [], memberCount: 1, currentUserRole: role });
  }

  const { data: members } = await getFamilyMembers(supabase, family.id);
  const { data: notes, error } = await getFamilyNotes(supabase, family.id, 10);
  if (error) return dbErrorToResponse(error);

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

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "babyId e texto são obrigatórios" },
      { status: 400 }
    );
  }
  const { babyId, text } = parsed.data;

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
    text
  );
  if (error) return dbErrorToResponse(error);

  return NextResponse.json({ data });
}

// DELETE /api/family/notes?noteId=... — remove a note (author or owner via RLS)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsedNote = zUuid.safeParse(req.nextUrl.searchParams.get("noteId"));
  if (!parsedNote.success)
    return NextResponse.json({ error: "noteId inválido" }, { status: 400 });
  const noteId = parsedNote.data;

  const { error } = await deleteFamilyNote(supabase, noteId);
  if (error) return dbErrorToResponse(error);

  return NextResponse.json({ success: true });
}
