import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { acceptFamilyInvite, getInviteByToken } from "@/lib/supabase/queries";

// GET /api/family/accept/[token] — preview invite info (for the accept page)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: invite, error } = await getInviteByToken(supabase, token);
  if (error || !invite) {
    return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      id: invite.id,
      role: invite.role,
      family_relation: invite.family_relation,
      family_id: invite.family_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      family_name: (invite as any).families?.name ?? "Familia",
      expires_at: invite.expires_at,
    },
  });
}

// POST /api/family/accept/[token] — accept invite (must be authenticated)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
  const email = user.email ?? null;

  const { data, error } = await acceptFamilyInvite(supabase, token, user.id, displayName, email);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}
