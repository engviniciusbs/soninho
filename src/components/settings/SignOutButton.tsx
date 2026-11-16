"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { unsubscribeThisDevice } from "@/lib/notifications/pushClient";
import { REGRESSION_AI_KEY_PREFIX } from "@/lib/sleep/regressionAiGate";
import { EMPTY_SLEEP_DRAFT, useSleepStore } from "@/store/sleepStore";
import { useFeedingStore } from "@/store/feedingStore";
import { IconLogout } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";

const LOCAL_KEYS = ["soninho-timer", "soninho-feeding-timer"];

/** Drops the timer stores (memory and storage) and the regression AI gate of this device. */
function clearLocalState() {
  // Memory first: the persist middleware writes on every set, so the keys
  // are removed after it.
  useSleepStore.setState({ activeBabyId: null, timers: {}, draft: { ...EMPTY_SLEEP_DRAFT } });
  useFeedingStore.setState({ timers: {} });
  try {
    for (const key of LOCAL_KEYS) localStorage.removeItem(key);
    const gateKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(REGRESSION_AI_KEY_PREFIX)) gateKeys.push(key);
    }
    for (const key of gateKeys) localStorage.removeItem(key);
  } catch {
    /* storage unavailable: nothing stored to clear */
  }
}

/**
 * Sign out of this device: cancels its push (while the session still
 * authorizes the DELETE), clears the local timers and the regression gate,
 * and ends the Supabase session. A push failure never blocks the sign-out.
 */
export async function signOutEverywhere(supabase = createClient()): Promise<void> {
  try {
    await unsubscribeThisDevice();
  } catch {
    /* offline or no worker: signing out still goes on */
  }
  clearLocalState();
  await supabase.auth.signOut();
}

/** "Sair da conta": cleans this device, ends the session and goes to the login page. */
export function SignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  // A ref, not the state: a second tap before the re-render must not run it again.
  const running = useRef(false);

  async function handleLogout() {
    if (running.current) return;
    running.current = true;
    setSigningOut(true);
    try {
      await signOutEverywhere();
      // Nothing of this user's data stays cached for the next one.
      queryClient.clear();
      router.push("/login");
      router.refresh();
    } catch {
      // The session could not be ended (offline): the button works again.
      running.current = false;
      setSigningOut(false);
    }
  }

  return (
    <Button
      variant="destructive"
      size="md"
      onClick={handleLogout}
      loading={signingOut}
      className="w-full"
    >
      <IconLogout />
      Sair da conta
    </Button>
  );
}
