import type { SleepSession } from "@/types";

export interface EnvironmentBucket {
  /** Bucket key, e.g. "18–20°C", "TOG 1.0", "rainy". */
  label: string;
  /** Number of completed sessions in this bucket. */
  count: number;
  /** Average quality (1–5) among sessions that recorded a quality. */
  avgQuality: number | null;
  /** Average duration in minutes. */
  avgDurationMin: number;
}

export interface EnvironmentCorrelation {
  temperature: EnvironmentBucket[];
  sleepSackTog: EnvironmentBucket[];
  weather: EnvironmentBucket[];
  /** Best-performing temperature bucket (by avg quality, then duration). */
  bestTemperature: EnvironmentBucket | null;
}

function tempBucketLabel(temp: number): string {
  if (temp < 18) return "< 18°C";
  if (temp < 20) return "18–19°C";
  if (temp < 22) return "20–21°C";
  if (temp < 24) return "22–23°C";
  if (temp < 26) return "24–25°C";
  return "≥ 26°C";
}

const WEATHER_LABELS: Record<string, string> = {
  sunny: "Ensolarado",
  cloudy: "Nublado",
  rainy: "Chuvoso",
  hot: "Muito quente",
  cold: "Frio",
  windy: "Ventando",
};

function summarize(
  groups: Map<string, SleepSession[]>
): EnvironmentBucket[] {
  return Array.from(groups.entries())
    .map(([label, sessions]) => {
      const withQuality = sessions.filter((s) => s.quality != null);
      const avgQuality =
        withQuality.length > 0
          ? parseFloat(
              (
                withQuality.reduce((a, s) => a + (s.quality ?? 0), 0) /
                withQuality.length
              ).toFixed(1)
            )
          : null;
      const avgDurationMin = Math.round(
        sessions.reduce((a, s) => a + (s.duration_min ?? 0), 0) / sessions.length
      );
      return { label, count: sessions.length, avgQuality, avgDurationMin };
    })
    .sort((a, b) => b.count - a.count);
}

/**
 * Correlates environment data (room temperature, sleep-sack TOG, weather) with
 * sleep quality and duration. Only completed sessions are considered.
 */
export function computeEnvironmentCorrelation(
  sessions: SleepSession[]
): EnvironmentCorrelation {
  const completed = sessions.filter((s) => s.duration_min != null);

  const byTemp = new Map<string, SleepSession[]>();
  const byTog = new Map<string, SleepSession[]>();
  const byWeather = new Map<string, SleepSession[]>();

  for (const s of completed) {
    if (s.room_temp_celsius != null) {
      const key = tempBucketLabel(s.room_temp_celsius);
      (byTemp.get(key) ?? byTemp.set(key, []).get(key)!).push(s);
    }
    if (s.sleep_sack_tog != null) {
      const key = `TOG ${s.sleep_sack_tog}`;
      (byTog.get(key) ?? byTog.set(key, []).get(key)!).push(s);
    }
    if (s.weather_condition) {
      const key = WEATHER_LABELS[s.weather_condition] ?? s.weather_condition;
      (byWeather.get(key) ?? byWeather.set(key, []).get(key)!).push(s);
    }
  }

  const temperature = summarize(byTemp);

  // Best temperature: needs at least 2 sessions and a recorded quality.
  const ranked = temperature
    .filter((b) => b.count >= 2 && b.avgQuality != null)
    .sort((a, b) => {
      if (b.avgQuality! !== a.avgQuality!) return b.avgQuality! - a.avgQuality!;
      return b.avgDurationMin - a.avgDurationMin;
    });

  return {
    temperature,
    sleepSackTog: summarize(byTog),
    weather: summarize(byWeather),
    bestTemperature: ranked[0] ?? null,
  };
}
