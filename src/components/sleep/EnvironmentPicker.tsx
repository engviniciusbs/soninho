"use client";

import {
  suggestSleepSackType,
  type SleepSackType,
  type WeatherCondition,
} from "@/lib/sleep/clothingRecommendation";
import type { EnvironmentData } from "./environment/types";
import { TempStepper } from "./environment/TempStepper";
import { WeatherSelector } from "./environment/WeatherSelector";
import { SackTypeSelector } from "./environment/SackTypeSelector";
import { TogSelector } from "./environment/TogSelector";
import { RecommendationCard } from "./environment/RecommendationCard";

export type { EnvironmentData } from "./environment/types";
export { EnvironmentPickerCompact } from "./environment/EnvironmentPickerCompact";

interface EnvironmentPickerProps {
  value: EnvironmentData;
  onChange: (data: EnvironmentData) => void;
  compact?: boolean;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function EnvironmentPicker({ value, onChange, compact = false }: EnvironmentPickerProps) {
  const sackType = (value.sleep_sack_type as SleepSackType) ?? null;
  const togValue = value.sleep_sack_tog;
  const temp = value.room_temp_celsius;

  function setTemp(t: number | null) {
    const suggestedSack = t !== null && !sackType ? suggestSleepSackType(t) : sackType;
    onChange({ ...value, room_temp_celsius: t });
    // Auto-suggest sack type only if none is selected yet
    if (t !== null && !sackType) {
      onChange({ ...value, room_temp_celsius: t, sleep_sack_type: suggestedSack });
    }
  }

  function setSackType(type: SleepSackType) {
    const newTog = type === "none" ? null : togValue;
    onChange({ ...value, sleep_sack_type: type, sleep_sack_tog: newTog });
  }

  function setTog(tog: number) {
    onChange({ ...value, sleep_sack_tog: togValue === tog ? null : tog });
  }

  function setWeather(w: WeatherCondition) {
    onChange({ ...value, weather_condition: value.weather_condition === w ? null : w });
  }

  return (
    <div className="space-y-5">
      {/* Temperature */}
      <TempStepper value={temp} onChange={setTemp} />

      {/* Weather condition */}
      <WeatherSelector value={value.weather_condition} onSelect={setWeather} />

      {/* Sleep sack type */}
      <SackTypeSelector value={sackType} onSelect={setSackType} />

      {/* TOG selector — only when a sack is selected */}
      <TogSelector sackType={sackType} value={togValue} onSelect={setTog} />

      {/* Clothing recommendation */}
      {!compact && (
        <RecommendationCard temp={temp} sackType={sackType} togValue={togValue} />
      )}
    </div>
  );
}
