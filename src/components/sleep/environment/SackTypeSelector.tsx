import { cn } from "@/lib/utils";
import { SACK_LABELS, type SleepSackType } from "@/lib/sleep/clothingRecommendation";
import { SACK_OPTIONS } from "./options";

// ─── Sleep sack type ──────────────────────────────────────────────────────────
export function SackTypeSelector({
  value,
  onSelect,
}: {
  value: SleepSackType | null;
  onSelect: (type: SleepSackType) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Saquinho de dormir
      </label>
      <div
        role="group"
        aria-label="Tipo de saquinho"
        className="grid grid-cols-4 gap-1.5"
      >
        {SACK_OPTIONS.map(({ value: sv, shortLabel, tog }) => {
          const isActive = value === sv || (!value && sv === "none");
          return (
            <button
              key={sv}
              type="button"
              aria-pressed={isActive}
              aria-label={`${SACK_LABELS[sv]}${tog ? ` (TOG ${tog})` : ""}`}
              onClick={() => onSelect(sv)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(sv); }}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl border py-2.5 px-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/50 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground"
              )}
              style={{ touchAction: "manipulation" }}
            >
              <span className="text-[11px] font-semibold leading-tight">{shortLabel}</span>
              {tog && (
                <span className="text-[10px] opacity-60 leading-tight">TOG {tog}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
