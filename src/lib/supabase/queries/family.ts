import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient;

// ── Family helpers ──────────────────────────────────────────────────────────

export async function getFamilyForBaby(supabase: Client, babyId: string) {
  const { data: baby, error } = await supabase
    .from("babies")
    .select("family_id")
    .eq("id", babyId)
    .single();
  if (error || !baby?.family_id) return { data: null, error };
  return supabase
    .from("families")
    .select("*")
    .eq("id", baby.family_id)
    .single();
}

export async function getFamilyMembers(supabase: Client, familyId: string) {
  return supabase
    .from("family_members")
    .select("*")
    .eq("family_id", familyId)
    .order("joined_at", { ascending: true });
}

export async function getUserFamilies(supabase: Client, userId: string) {
  return supabase
    .from("family_members")
    .select("family_id, role, families(*)")
    .eq("user_id", userId);
}

export async function getUserRoleForBaby(
  supabase: Client,
  userId: string,
  babyId: string
): Promise<"owner" | "caregiver" | "viewer" | null> {
  const { data: baby } = await supabase
    .from("babies")
    .select("family_id, user_id")
    .eq("id", babyId)
    .single();

  if (!baby) return null;

  const { data: member } = await supabase
    .from("family_members")
    .select("role")
    .eq("family_id", baby.family_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (member) return member.role as "owner" | "caregiver" | "viewer";

  // Fallback: direct owner (for babies without family_id set)
  if (baby.user_id === userId) return "owner";

  return null;
}

export async function createFamilyInvite(
  supabase: Client,
  familyId: string,
  createdBy: string,
  role: "caregiver" | "viewer",
  familyRelation?: string | null
) {
  return supabase
    .from("family_invites")
    .insert({
      family_id: familyId,
      created_by: createdBy,
      role,
      family_relation: familyRelation ?? null,
    })
    .select()
    .single();
}

export async function getActiveFamilyInvites(
  supabase: Client,
  familyId: string
) {
  return supabase
    .from("family_invites")
    .select("*")
    .eq("family_id", familyId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
}

export async function revokeFamilyInvite(
  supabase: Client,
  inviteId: string,
  familyId: string
) {
  return supabase
    .from("family_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("family_id", familyId)
    .select("id");
}

export type InvitePreview = {
  status: "valid" | "expired" | "revoked" | "accepted" | "not_found";
  family_name: string | null;
  role: "caregiver" | "viewer" | null;
  family_relation: string | null;
  inviter_name: string | null;
  expires_at: string | null;
};

export async function getInvitePreview(
  supabase: Client,
  token: string
): Promise<{ data: InvitePreview | null; error: { message: string } | null }> {
  const { data, error } = await supabase.rpc("get_invite_preview", { p_token: token });
  if (error) return { data: null, error };
  const row = (Array.isArray(data) ? data[0] : data) as InvitePreview | undefined;
  return { data: row ?? null, error: null };
}

export async function acceptFamilyInvite(
  supabase: Client,
  token: string,
  displayName: string | null
): Promise<{ data: { family_id: string } | null; error: { message: string; code?: string } | null }> {
  const { data, error } = await supabase.rpc("accept_family_invite", {
    p_token: token,
    p_display_name: displayName,
  });
  if (error) return { data: null, error };
  return { data: { family_id: data as string }, error: null };
}

export async function removeFamilyMember(
  supabase: Client,
  familyId: string,
  userId: string
) {
  return supabase
    .from("family_members")
    .delete()
    .eq("family_id", familyId)
    .eq("user_id", userId)
    .select("id");
}

export async function updateMemberRole(
  supabase: Client,
  familyId: string,
  userId: string,
  role: "caregiver" | "viewer"
) {
  return supabase
    .from("family_members")
    .update({ role })
    .eq("family_id", familyId)
    .eq("user_id", userId)
    .select("id");
}

// ── Family notes (mural / handoff) ──────────────────────────────────────────

export async function getFamilyNotes(
  supabase: Client,
  familyId: string,
  limit: number = 10
) {
  return supabase
    .from("family_notes")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function createFamilyNote(
  supabase: Client,
  familyId: string,
  authorId: string,
  authorName: string | null,
  body: string
) {
  return supabase
    .from("family_notes")
    .insert({
      family_id: familyId,
      author_id: authorId,
      author_name: authorName,
      body,
    })
    .select()
    .single();
}

export async function deleteFamilyNote(supabase: Client, noteId: string) {
  return supabase.from("family_notes").delete().eq("id", noteId);
}

export async function updateMemberFamilyRelation(
  supabase: Client,
  familyId: string,
  userId: string,
  familyRelation: string | null
) {
  return supabase
    .from("family_members")
    .update({ family_relation: familyRelation })
    .eq("family_id", familyId)
    .eq("user_id", userId);
}
