import type { ComponentType } from "react";
import {
  IconCloud,
  IconRain,
  IconSnow,
  IconSun,
  IconThermometer,
  IconWind,
  type IconProps,
} from "@/components/brand/icons";
import type { SleepSackType, WeatherCondition } from "@/lib/sleep/clothingRecommendation";

// ─── Weather options ──────────────────────────────────────────────────────────
export const WEATHER_OPTIONS: { value: WeatherCondition; label: string; icon: ComponentType<IconProps> }[] = [
  { value: "sunny",  label: "Ensolarado",  icon: IconSun },
  { value: "cloudy", label: "Nublado",     icon: IconCloud },
  { value: "rainy",  label: "Chuvoso",     icon: IconRain },
  { value: "hot",    label: "Muito quente",icon: IconThermometer },
  { value: "cold",   label: "Frio",        icon: IconSnow },
  { value: "windy",  label: "Ventando",    icon: IconWind },
];

// ─── Sack type options ────────────────────────────────────────────────────────
export const SACK_OPTIONS: { value: SleepSackType; shortLabel: string; tog?: string }[] = [
  { value: "none",    shortLabel: "Nenhum" },
  { value: "mesh",    shortLabel: "Malha",   tog: "~0,5" },
  { value: "flannel", shortLabel: "Flanela", tog: "1–2" },
  { value: "fleece",  shortLabel: "Fleece",  tog: "2–3" },
];

/** Section label of the picker: sentence case, never tracked capitals. */
export const FIELD_LABEL = "font-sans text-sm font-bold text-sn-mu";

/** A selectable tile (weather, sack): 44px or more, only transform animates. */
export const TILE =
  "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] px-2 py-2.5 font-sans outline-none select-none transition-transform duration-(--sn-dur-micro) ease-sn-out active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr";
export const TILE_ON = "border-sn-pr bg-sn-pr/10 text-sn-tx";
export const TILE_OFF = "border-sn-bd bg-sn-s2/50 text-sn-mu hover:border-sn-pr/60 hover:text-sn-tx";
