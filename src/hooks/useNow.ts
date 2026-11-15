"use client";

import { useSyncExternalStore } from "react";

/**
 * Shared wall-clock hook. One module-level store per interval length, so any
 * number of consumers share a single setInterval and read the identical value
 * (Date.now() floored to whole seconds) on each tick.
 *
 * Hydration: the snapshot is `null` until the store has started ticking. The
 * server snapshot is `null` and so is the first client snapshot, so there is no
 * hydration mismatch. The first subscriber starts the store, which stamps the
 * current time synchronously inside subscribe(); useSyncExternalStore then
 * re-checks the snapshot and re-renders with the real value right after mount.
 * When the last subscriber leaves, the interval is cleared and the value
 * resets to `null` so a later mount again starts from the same null snapshot.
 */
interface Store {
  value: number | null;
  listeners: Set<() => void>;
  timer: ReturnType<typeof setInterval> | null;
  subscribe: (listener: () => void) => () => void;
}

const stores = new Map<number, Store>();

function tickValue(): number {
  return Math.floor(Date.now() / 1000) * 1000;
}

function getStore(intervalMs: number): Store {
  const store = stores.get(intervalMs);
  if (store) return store;
  const s: Store = {
    value: null,
    listeners: new Set(),
    timer: null,
    subscribe(listener) {
      s.listeners.add(listener);
      if (s.timer === null) {
        s.value = tickValue();
        s.timer = setInterval(() => {
          s.value = tickValue();
          s.listeners.forEach((l) => l());
        }, intervalMs);
      }
      return () => {
        s.listeners.delete(listener);
        if (s.listeners.size === 0 && s.timer !== null) {
          clearInterval(s.timer);
          s.timer = null;
          s.value = null;
        }
      };
    },
  };
  stores.set(intervalMs, s);
  return s;
}

const getServerSnapshot = (): number | null => null;
const subscribeNothing = () => () => {};

/**
 * @param enabled when false the hook neither subscribes nor ticks and returns
 *   `null`, so idle consumers (e.g. no timer running) don't keep the clock alive.
 */
export function useNow(intervalMs: number = 1000, enabled: boolean = true): number | null {
  const store = getStore(intervalMs);
  return useSyncExternalStore(
    enabled ? store.subscribe : subscribeNothing,
    () => (enabled ? store.value : null),
    getServerSnapshot
  );
}
