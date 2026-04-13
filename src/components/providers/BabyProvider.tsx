"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
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
  const { activeBabyId, setActiveBabyId } = useSleepStore();
  const [activeBaby, setActiveBabyState] = useState<Baby | null>(null);

  const { data: babies = [], isLoading } = useQuery({
    queryKey: ["babies"],
    queryFn: async () => {
      const { data, error } = await getBabies(supabase);
      if (error) throw error;
      return data;
    },
  });

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
