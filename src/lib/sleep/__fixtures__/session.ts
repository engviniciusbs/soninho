import type { SleepSession } from "@/types";

/**
 * Test fixture factory. Mirrors the DB trigger: duration_min is
 * floor((end - start) / 60000) when end_time is present, otherwise null.
 */
export function makeSession(partial: Partial<SleepSession> = {}): SleepSession {
  const start_time = partial.start_time ?? "2026-05-24T12:00:00Z";
  const end_time = partial.end_time ?? null;
  const computedDuration = end_time
    ? Math.floor(
        (new Date(end_time).getTime() - new Date(start_time).getTime()) / 60_000
      )
    : null;

  return {
    id: "00000000-0000-4000-8000-000000000001",
    baby_id: "00000000-0000-4000-8000-0000000000b1",
    type: "NAP",
    start_time,
    end_time,
    duration_min: computedDuration,
    clothing_description: null,
    how_fell_asleep: null,
    location: null,
    notes: null,
    quality: null,
    room_temp_celsius: null,
    sleep_sack_tog: null,
    sleep_sack_type: null,
    wake_reason: null,
    weather_condition: null,
    created_at: start_time,
    updated_at: start_time,
    ...partial,
  };
}
