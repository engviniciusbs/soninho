import { cn } from "@/lib/utils";
import type { WeatherCondition } from "@/lib/sleep/clothingRecommendation";
import { WEATHER_OPTIONS } from "./options";

// ─── Weather condition (optional) ─────────────────────────────────────────────
export function WeatherSelector({
  value,
  onSelect,
}: {
  value: string | null;
  onSelect: (w: WeatherCondition) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Clima externo
        <span className="ml-1 normal-case font-normal text-muted-foreground/50">(opcional)</span>
      </label>
      <div
        role="group"
        aria-label="Condição climática"
        className="grid grid-cols-3 gap-2"
      >
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
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border py-2.5 px-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/50 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground"
              )}
              style={{ touchAction: "manipulation" }}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="leading-tight text-center">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
