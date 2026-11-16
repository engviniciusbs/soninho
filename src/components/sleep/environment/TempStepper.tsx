import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Temperature stepper ──────────────────────────────────────────────────────
export function TempStepper({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const temp = value ?? 22;

  const tempColor =
    temp >= 28 ? "text-orange-400" :
    temp >= 24 ? "text-amber-400" :
    temp >= 20 ? "text-emerald-400" :
    temp >= 16 ? "text-sky-400" :
    "text-indigo-400";

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Temperatura do quarto
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Diminuir temperatura"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(Math.max(10, temp - 0.5)); }}
          onClick={() => onChange(Math.max(10, temp - 0.5))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card/50 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          style={{ touchAction: "manipulation" }}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex flex-1 items-center justify-center gap-1">
          <span
            className={cn("text-3xl font-bold tabular-nums transition-colors", tempColor)}
            aria-live="polite"
            aria-atomic="true"
          >
            {value === null ? "—" : temp.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground mt-1">°C</span>
        </div>

        <button
          type="button"
          aria-label="Aumentar temperatura"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(Math.min(40, temp + 0.5)); }}
          onClick={() => onChange(Math.min(40, temp + 0.5))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card/50 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          style={{ touchAction: "manipulation" }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Quick presets */}
      <div className="flex gap-1.5 flex-wrap">
        {[18, 20, 22, 24, 26, 28].map((t) => (
          <button
            key={t}
            type="button"
            aria-label={`Definir temperatura como ${t}°C`}
            aria-pressed={value === t}
            onClick={() => onChange(t)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(t); }}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === t
                ? "bg-primary text-primary-foreground"
                : "border border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
            style={{ touchAction: "manipulation" }}
          >
            {t}°
          </button>
        ))}
        {value !== null && (
          <button
            type="button"
            aria-label="Limpar temperatura"
            onClick={() => onChange(null)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(null); }}
            className="rounded-lg px-2.5 py-1 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ touchAction: "manipulation" }}
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
