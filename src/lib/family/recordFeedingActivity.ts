import type { FeedingType } from "@/types";

/** Fire-and-forget: log feeding start/stop/logged and notify family. */
export async function recordFeedingActivity(params: {
  babyId: string;
  babyName: string;
  action: "started" | "stopped" | "logged";
  feedingType: FeedingType;
  referenceId?: string;
}): Promise<void> {
  try {
    await fetch("/api/family/feeding-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch {
    // Non-blocking
  }
}
