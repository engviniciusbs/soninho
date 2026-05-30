/** Fire-and-forget: log sleep start/stop and notify family. */
export async function recordSleepActivity(params: {
  babyId: string;
  babyName: string;
  action: "started" | "stopped";
  sleepSessionId?: string;
  sleepType: "NAP" | "NIGHT_SLEEP";
}): Promise<void> {
  try {
    await fetch("/api/family/sleep-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch {
    // Non-blocking
  }
}
