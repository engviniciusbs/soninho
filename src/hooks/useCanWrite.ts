"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getUserRoleForBaby } from "@/lib/supabase/queries/family";
import { useBaby } from "@/components/providers/BabyProvider";

export const canWriteKey = (babyId: string | undefined) => ["family-role", babyId] as const;

/**
 * Whether the signed-in user may record for the active baby: owner or
 * caregiver of its family (`family_members`). A viewer ("Só visualizar"),
 * no role, or no session can only see. While the role loads, `canWrite` is
 * false, so write controls never flash for a viewer. RLS enforces the same
 * rule on the server (`user_can_write_family`); this only hides the controls.
 */
export function useCanWrite(): { canWrite: boolean; isLoading: boolean } {
  const { activeBaby } = useBaby();
  const babyId = activeBaby?.id;
  const [supabase] = useState(() => createClient());

  const { data: role, isPending } = useQuery({
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

  const isLoading = !!babyId && isPending;
  return { canWrite: !isLoading && (role === "owner" || role === "caregiver"), isLoading };
}
