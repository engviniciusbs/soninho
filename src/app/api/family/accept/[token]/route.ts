import { NextRequest, NextResponse } from "next/server";
import { dbErrorToResponse } from "@/lib/http/errors";
import { createClient } from "@/lib/supabase/server";
import { normalizeInviteToken } from "@/lib/invites/inviteLink";
import { acceptFamilyInvite, getInvitePreview } from "@/lib/supabase/queries";

// GET /api/family/accept/[token] — preview invite info (for the accept page)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Next already decoded `params` once; normalize only decodes if a `%` remains.
  const token = normalizeInviteToken((await params).token);
  const supabase = await createClient();

  const { data: preview, error } = await getInvitePreview(supabase, token);
  if (error) {
    return NextResponse.json({ error: "Erro ao carregar convite" }, { status: 500 });
  }
  if (!preview || preview.status !== "valid") {
    return NextResponse.json(
      { error: "Convite inválido ou expirado", status: preview?.status ?? "not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: {
      status: preview.status,
      family_name: preview.family_name,
      role: preview.role,
      family_relation: preview.family_relation,
      inviter_name: preview.inviter_name,
      expires_at: preview.expires_at,
    },
  });
}

// POST /api/family/accept/[token] — accept invite (must be authenticated)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Next already decoded `params` once; normalize only decodes if a `%` remains.
  const token = normalizeInviteToken((await params).token);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;

  const { data, error } = await acceptFamilyInvite(supabase, token, displayName);
  if (error) {
    return dbErrorToResponse(error);
  }

  return NextResponse.json({ success: true, data });
}
