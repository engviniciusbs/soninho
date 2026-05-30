"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { UiMode, UserProfile } from "@/types";

interface UserProfileContextValue {
  profile: UserProfile | null;
  isLoading: boolean;
  isNannyMode: boolean;
  refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const { data } = await res.json();
        setProfile(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const isNannyMode = profile?.ui_mode === "nanny";

  const value = useMemo(
    () => ({
      profile,
      isLoading,
      isNannyMode,
      refreshProfile,
    }),
    [profile, isLoading, isNannyMode, refreshProfile]
  );

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error("useUserProfile must be used within UserProfileProvider");
  }
  return ctx;
}

export function useUiMode(): UiMode {
  const { profile } = useUserProfile();
  return profile?.ui_mode ?? "standard";
}
