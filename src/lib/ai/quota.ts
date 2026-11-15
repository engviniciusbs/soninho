import type { SupabaseClient } from "@supabase/supabase-js";

export const AI_DAILY_LIMIT = 50;

export const AI_QUOTA_EXCEEDED_MESSAGE =
  "Limite diário de uso da IA atingido. Tente novamente amanhã.";

/** Atomically consumes one unit of today's AI quota. False when exhausted. */
export async function consumeAiQuota(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_ai_quota", {
    p_limit: AI_DAILY_LIMIT,
  });
  if (error) throw error;
  return data === true;
}
