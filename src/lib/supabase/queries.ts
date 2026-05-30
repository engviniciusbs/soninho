import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient;

export async function getBabies(supabase: Client) {
  return supabase
    .from("babies")
    .select("*")
    .order("created_at", { ascending: true });
}

export async function getBaby(supabase: Client, babyId: string) {
  return supabase.from("babies").select("*").eq("id", babyId).single();
}

export async function createBaby(
  supabase: Client,
  data: { user_id: string; name: string; birth_date: string; avatar_emoji?: string; avatar_url?: string | null }
) {
  // 1. Create the family
  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({ name: `${data.name}'s familia`, created_by: data.user_id })
    .select()
    .single();

  if (familyError) return { data: null, error: familyError };

  // 2. Add owner as member
  const { error: memberError } = await supabase.from("family_members").insert({
    family_id: family.id,
    user_id: data.user_id,
    role: "owner",
  });

  if (memberError) return { data: null, error: memberError };

  // 3. Create baby linked to family
  return supabase
    .from("babies")
    .insert({ ...data, family_id: family.id })
    .select()
    .single();
}

export async function updateBaby(
  supabase: Client,
  babyId: string,
  data: { name?: string; birth_date?: string; avatar_emoji?: string; avatar_url?: string | null }
) {
  return supabase.from("babies").update(data).eq("id", babyId).select().single();
}

export async function deleteBaby(supabase: Client, babyId: string) {
  return supabase.from("babies").delete().eq("id", babyId);
}

export async function getSleepSessions(
  supabase: Client,
  babyId: string,
  from: Date,
  to: Date
) {
  return supabase
    .from("sleep_sessions")
    .select("*")
    .eq("baby_id", babyId)
    .gte("start_time", from.toISOString())
    .lte("start_time", to.toISOString())
    .order("start_time", { ascending: false });
}

export async function getLastSleepSession(supabase: Client, babyId: string) {
  return supabase
    .from("sleep_sessions")
    .select("*")
    .eq("baby_id", babyId)
    .not("end_time", "is", null)
    .order("end_time", { ascending: false })
    .limit(1)
    .single();
}

export async function getActiveSleepSession(supabase: Client, babyId: string) {
  return supabase
    .from("sleep_sessions")
    .select("*")
    .eq("baby_id", babyId)
    .is("end_time", null)
    .maybeSingle();
}

export async function startSleepSession(
  supabase: Client,
  babyId: string,
  type: "NAP" | "NIGHT_SLEEP",
  env?: {
    notes?: string;
    room_temp_celsius?: number | null;
    weather_condition?: string | null;
    sleep_sack_type?: string | null;
    sleep_sack_tog?: number | null;
    /** Override the start time (ISO string). Defaults to now. */
    start_time?: string;
  }
) {
  return supabase
    .from("sleep_sessions")
    .insert({
      baby_id: babyId,
      type,
      start_time: env?.start_time ?? new Date().toISOString(),
      notes: env?.notes || null,
      room_temp_celsius: env?.room_temp_celsius ?? null,
      weather_condition: env?.weather_condition ?? null,
      sleep_sack_type: env?.sleep_sack_type ?? null,
      sleep_sack_tog: env?.sleep_sack_tog ?? null,
    })
    .select()
    .single();
}

export async function endSleepSession(supabase: Client, sessionId: string) {
  return supabase
    .from("sleep_sessions")
    .update({ end_time: new Date().toISOString() })
    .eq("id", sessionId)
    .select()
    .single();
}

export async function updateSleepSession(
  supabase: Client,
  sessionId: string,
  data: {
    type?: "NAP" | "NIGHT_SLEEP";
    start_time?: string;
    end_time?: string | null;
    quality?: number | null;
    notes?: string | null;
    location?: string | null;
    how_fell_asleep?: string | null;
    wake_reason?: string | null;
    room_temp_celsius?: number | null;
    weather_condition?: string | null;
    sleep_sack_type?: string | null;
    sleep_sack_tog?: number | null;
    clothing_description?: string | null;
  }
) {
  return supabase
    .from("sleep_sessions")
    .update(data)
    .eq("id", sessionId)
    .select()
    .single();
}

export async function deleteSleepSession(supabase: Client, sessionId: string) {
  return supabase.from("sleep_sessions").delete().eq("id", sessionId);
}

export async function getRecentSessions(
  supabase: Client,
  babyId: string,
  days: number = 7
) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  return getSleepSessions(supabase, babyId, from, new Date());
}

// ── Notification preferences ──

export async function getNotificationPreferences(supabase: Client, userId: string) {
  return supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function upsertNotificationPreferences(
  supabase: Client,
  userId: string,
  data: {
    enabled?: boolean;
    alert_before_minutes?: number;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
    timezone?: string;
    weekly_email_enabled?: boolean;
  }
) {
  return supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

// ── Push subscriptions ──

export async function upsertPushSubscription(
  supabase: Client,
  data: {
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    user_agent?: string | null;
  }
) {
  return supabase.from("push_subscriptions").upsert(
    {
      ...data,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );
}

export async function deactivatePushSubscription(
  supabase: Client,
  userId: string,
  endpoint: string
) {
  return supabase
    .from("push_subscriptions")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
}

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
  role: "caregiver" | "viewer"
) {
  return supabase
    .from("family_invites")
    .insert({ family_id: familyId, created_by: createdBy, role })
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
  inviteId: string
) {
  return supabase
    .from("family_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId);
}

export async function getInviteByToken(supabase: Client, token: string) {
  return supabase
    .from("family_invites")
    .select("*, families(name, created_by)")
    .eq("token", token)
    .is("revoked_at", null)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
}

export async function acceptFamilyInvite(
  supabase: Client,
  token: string,
  userId: string,
  displayName: string | null,
  email: string | null
) {
  const { data: invite, error } = await supabase
    .from("family_invites")
    .select("*")
    .eq("token", token)
    .is("revoked_at", null)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !invite) return { data: null, error: error ?? new Error("Invalid or expired invite") };

  // Add member
  const { error: memberError } = await supabase.from("family_members").insert({
    family_id: invite.family_id,
    user_id: userId,
    role: invite.role,
    display_name: displayName,
    email,
    invited_by: invite.created_by,
  });

  if (memberError) return { data: null, error: memberError };

  // Mark invite as accepted
  await supabase
    .from("family_invites")
    .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
    .eq("id", invite.id);

  return { data: invite, error: null };
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
    .eq("user_id", userId);
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
    .eq("user_id", userId);
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
