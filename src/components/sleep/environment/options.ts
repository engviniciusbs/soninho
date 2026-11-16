import type { ComponentType } from "react";
import { Sun, Cloud, CloudRain, Thermometer, Snowflake, Wind } from "lucide-react";
import type { SleepSackType, WeatherCondition } from "@/lib/sleep/clothingRecommendation";

// ─── Weather options ──────────────────────────────────────────────────────────
export const WEATHER_OPTIONS: { value: WeatherCondition; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { value: "sunny",  label: "Ensolarado",  icon: Sun },
  { value: "cloudy", label: "Nublado",     icon: Cloud },
  { value: "rainy",  label: "Chuvoso",     icon: CloudRain },
  { value: "hot",    label: "Muito quente",icon: Thermometer },
  { value: "cold",   label: "Frio",        icon: Snowflake },
  { value: "windy",  label: "Ventando",    icon: Wind },
];

// ─── Sack type options ────────────────────────────────────────────────────────
export const SACK_OPTIONS: { value: SleepSackType; shortLabel: string; tog?: string }[] = [
  { value: "none",    shortLabel: "Nenhum" },
  { value: "mesh",    shortLabel: "Malha",   tog: "~0.5" },
  { value: "flannel", shortLabel: "Flanela", tog: "1–2" },
  { value: "fleece",  shortLabel: "Fleece",  tog: "2–3" },
];
