/** localStorage key marking that the AI explanation was already requested for a baby today. */
export function regressionAiKey(babyId: string, now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `soninho-regression-ai:${babyId}:${y}-${m}-${d}`;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function safeStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** True when the AI explanation was not yet requested today (storage failures count as "not yet"). */
export function shouldRequestRegressionAi(
  babyId: string,
  now: Date = new Date(),
  storage: StorageLike | null = safeStorage()
): boolean {
  try {
    return storage?.getItem(regressionAiKey(babyId, now)) == null;
  } catch {
    return true;
  }
}

export function markRegressionAiRequested(
  babyId: string,
  now: Date = new Date(),
  storage: StorageLike | null = safeStorage()
): void {
  try {
    storage?.setItem(regressionAiKey(babyId, now), "1");
  } catch {
    /* storage unavailable: ignore */
  }
}
