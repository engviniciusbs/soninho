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
  // family + owner membership + baby are created atomically server-side
  return supabase.rpc("create_baby_with_family", {
    p_name: data.name,
    p_birth_date: data.birth_date,
    p_avatar_emoji: data.avatar_emoji ?? "🍼",
    p_avatar_url: data.avatar_url ?? null,
  });
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
    .eq("family_id", familyId);
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

// ── User profiles ───────────────────────────────────────────────────────────

export async function getUserProfile(supabase: Client, userId: string) {
  return supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function upsertUserProfile(
  supabase: Client,
  userId: string,
  patch: {
    display_name?: string | null;
    family_relation?: string | null;
    ui_mode?: "standard" | "nanny";
  }
) {
  return supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: userId,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();
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

// ── Sleep activity log ──────────────────────────────────────────────────────

export async function getSleepActivityLog(
  supabase: Client,
  babyId: string,
  limit: number = 15
) {
  return supabase
    .from("sleep_activity_log")
    .select("*")
    .eq("baby_id", babyId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function insertSleepActivityLog(
  supabase: Client,
  row: {
    baby_id: string;
    family_id?: string | null;
    actor_user_id: string;
    actor_name?: string | null;
    actor_relation?: string | null;
    action: "started" | "stopped";
    sleep_session_id?: string | null;
    sleep_type?: "NAP" | "NIGHT_SLEEP" | null;
  }
) {
  return supabase.from("sleep_activity_log").insert(row).select().single();
}
