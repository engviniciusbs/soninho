"use client";

import { useEffect, useState, useCallback } from "react";
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getExistingSubscription,
  registerServiceWorker,
} from "@/lib/notifications/pushClient";

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

export function usePushNotifications(): PushNotificationState {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const supported = isPushSupported();
      setIsSupported(supported);

      if (!supported) {
        setIsLoading(false);
        return;
      }

      setPermission(Notification.permission);

      await registerServiceWorker();
      const existing = await getExistingSubscription();

      if (existing) {
        // Re-sync browser subscription with DB on every mount (handles the case
        // where DB row was lost but browser still has a valid subscription)
        try {
          await fetch("/api/notifications/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: existing.endpoint,
              p256dh: btoa(String.fromCharCode(...new Uint8Array(existing.getKey("p256dh")!))),
              auth: btoa(String.fromCharCode(...new Uint8Array(existing.getKey("auth")!))),
              userAgent: navigator.userAgent,
            }),
          });
        } catch {
          // Silently ignore sync errors (e.g. user not logged in yet)
        }
      }

      setIsSubscribed(!!existing);
      setIsLoading(false);
    }
    init();
  }, []);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const ok = await subscribeToPush();
      setIsSubscribed(ok);
      setPermission(Notification.permission);
      return ok;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const ok = await unsubscribeFromPush();
      if (ok) setIsSubscribed(false);
      return ok;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
