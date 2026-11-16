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

/**
 * Creates the baby server-side. With `familyId` (a family the caller owns) the
 * baby joins it; without it the RPC uses the caller's only owned family, or
 * creates a new family (with owner membership) when they own none. The sex
 * goes in the same call.
 */
export async function createBaby(
  supabase: Client,
  data: {
    name: string;
    birth_date: string;
    avatar_emoji?: string;
    avatar_url?: string | null;
    sex?: "F" | "M" | null;
  },
  familyId?: string | null
) {
  return supabase.rpc("create_baby_with_family", {
    p_name: data.name,
    p_birth_date: data.birth_date,
    p_avatar_emoji: data.avatar_emoji ?? "🍼",
    p_avatar_url: data.avatar_url ?? null,
    // Saved in the same insert as the baby (atomic).
    p_sex: data.sex ?? null,
    ...(familyId ? { p_family_id: familyId } : {}),
  });
}

/** Ids of the families where `userId` is owner. */
export async function getOwnedFamilyIds(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .eq("role", "owner");
  return {
    data: ((data ?? []) as { family_id: string }[]).map((r) => r.family_id),
    error,
  };
}

export async function updateBaby(
  supabase: Client,
  babyId: string,
  data: {
    name?: string;
    birth_date?: string;
    avatar_emoji?: string;
    avatar_url?: string | null;
    sex?: "F" | "M" | null;
  }
) {
  return supabase.from("babies").update(data).eq("id", babyId).select().single();
}

/**
 * Owner-only deletion (RPC `delete_baby`): refuses with 42501 otherwise, so a
 * non-owner never sees a silent no-op. Deleting the family's last baby also
 * deletes the family (members, invites and notes by cascade).
 */
export async function deleteBaby(supabase: Client, babyId: string) {
  return supabase.rpc("delete_baby", { p_baby_id: babyId });
}
