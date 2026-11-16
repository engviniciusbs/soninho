import type { SupabaseClient } from "@supabase/supabase-js";
import { localDayKey } from "@/lib/dates/localDate";

export const AI_DAILY_LIMIT = 50;

export const AI_QUOTA_EXCEEDED_MESSAGE =
  "Limite diário de IA atingido. Tente novamente amanhã.";

/** Atomically consumes one unit of today's AI quota. False when exhausted. */
export async function consumeAiQuota(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_ai_quota", {
    p_limit: AI_DAILY_LIMIT,
  });
  if (error) throw error;
  return data === true;
}

/**
 * Like {@link consumeAiQuota} but never throws: an RPC failure counts as "no
 * quota", so callers with a deterministic fallback can degrade instead of 500.
 */
export async function tryConsumeAiQuota(supabase: SupabaseClient): Promise<boolean> {
  try {
    return await consumeAiQuota(supabase);
  } catch (error) {
    console.error("AI quota check failed:", error);
    return false;
  }
}

/** The day consume_ai_quota counts by: `(now() at time zone 'America/Sao_Paulo')::date`. */
const AI_QUOTA_TIMEZONE = "America/Sao_Paulo";

/**
 * Read-only pre-check (service-role client: users cannot read ai_usage), so a
 * user over the limit never reaches OpenAI. The atomic consume_ai_quota stays
 * the real gate. Throws on a read error.
 */
export async function isAiQuotaExhausted(
  admin: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<boolean> {
  const { data, error } = await admin
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("day", localDayKey(now, AI_QUOTA_TIMEZONE))
    .maybeSingle();
  if (error) throw error;
  return (data?.count ?? 0) >= AI_DAILY_LIMIT;
}
