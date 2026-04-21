"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getBabies } from "@/lib/supabase/queries";
import { useSleepStore } from "@/store/sleepStore";
import type { Baby } from "@/types";

interface BabyContextValue {
  babies: Baby[];
  activeBaby: Baby | null;
  setActiveBaby: (baby: Baby) => void;
  isLoading: boolean;
}

const BabyContext = createContext<BabyContextValue>({
  babies: [],
  activeBaby: null,
  setActiveBaby: () => {},
  isLoading: true,
});

export function useBaby() {
  return useContext(BabyContext);
}

export function BabyProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { activeBabyId, setActiveBabyId } = useSleepStore();
  const [activeBaby, setActiveBabyState] = useState<Baby | null>(null);

  // Auth-readiness guard: don't query babies until the Supabase session cookie
  // is confirmed. Without this, RLS blocks the query and React Query caches an
  // empty result for up to 60 seconds — causing the "baby disappeared" bug.
  const [authReady, setAuthReady] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      setSessionUserId(session?.user?.id ?? null);
      setAuthReady(true);
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setSessionUserId(uid);
      setAuthReady(true);
      // Invalidate so the baby list re-fetches for the new (or logged-out) user
      queryClient.invalidateQueries({ queryKey: ["babies"] });
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: babies = [], isPending } = useQuery({
    // Include sessionUserId so a different user never reads another user's cached babies
    queryKey: ["babies", sessionUserId],
    queryFn: async () => {
      const { data, error } = await getBabies(supabase);
      if (error) throw error;
      return data;
    },
    enabled: authReady && !!sessionUserId,
  });

  // Derive isLoading: true while auth is being established, or while the
  // query is running for a known user
  const isLoading = !authReady || (authReady && !!sessionUserId && isPending);

  useEffect(() => {
    if (babies.length === 0) return;

    const stored = babies.find((b) => b.id === activeBabyId);
    if (stored) {
      setActiveBabyState(stored);
    } else {
      setActiveBabyState(babies[0]);
      setActiveBabyId(babies[0].id);
    }
  }, [babies, activeBabyId, setActiveBabyId]);

  function setActiveBaby(baby: Baby) {
    setActiveBabyState(baby);
    setActiveBabyId(baby.id);
  }

  return (
    <BabyContext.Provider value={{ babies, activeBaby, setActiveBaby, isLoading }}>
      {children}
    </BabyContext.Provider>
  );
}
