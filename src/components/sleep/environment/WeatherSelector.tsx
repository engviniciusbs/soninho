import { useId } from "react";
import { cn } from "@/lib/utils";
import type { WeatherCondition } from "@/lib/sleep/clothingRecommendation";
import { FIELD_LABEL, TILE, TILE_OFF, TILE_ON, WEATHER_OPTIONS } from "./options";

// ─── Weather condition (optional) ─────────────────────────────────────────────
export function WeatherSelector({
  value,
  onSelect,
}: {
  value: string | null;
  onSelect: (w: WeatherCondition) => void;
}) {
  const labelId = useId();
  return (
    <div className="space-y-2">
      <p id={labelId} className={FIELD_LABEL}>
        Clima externo <span className="font-semibold">(opcional)</span>
      </p>
      <div role="group" aria-label="Condição climática" className="grid grid-cols-3 gap-2">
        {WEATHER_OPTIONS.map(({ value: wv, label, icon: Icon }) => {
          const isActive = value === wv;
          return (
            <button
              key={wv}
              type="button"
              aria-pressed={isActive}
              aria-label={label}
              onClick={() => onSelect(wv)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(wv); }}
              className={cn(TILE, isActive ? TILE_ON : TILE_OFF)}
            >
              <Icon size={20} className={isActive ? "text-sn-pr" : undefined} />
              <span className="text-center text-[13px] leading-tight font-bold">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
