"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getUserRoleForBaby } from "@/lib/supabase/queries/family";
import { useBaby } from "@/components/providers/BabyProvider";

export const canWriteKey = (babyId: string | undefined) => ["family-role", babyId] as const;

/**
 * Whether the write controls show for the active baby. Fails open: they hide
 * only when the role is known to be "viewer" ("Só visualizar"). While the
 * role loads, when the query fails, or when no role comes back (the helper
 * also returns null on a read error), an owner or caregiver must never get a
 * read-only screen. RLS is the real guard (`user_can_write_family`).
 */
export function useCanWrite(): { canWrite: boolean; isLoading: boolean } {
  const { activeBaby } = useBaby();
  const babyId = activeBaby?.id;
  const [supabase] = useState(() => createClient());

  const { data: role, isPending, isError } = useQuery({
    queryKey: canWriteKey(babyId),
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId || !babyId) return null;
      return getUserRoleForBaby(supabase, userId, babyId);
    },
    enabled: !!babyId,
    staleTime: 60_000,
  });

  const isLoading = !!babyId && isPending && !isError;
  return { canWrite: isError || role !== "viewer", isLoading };
}
