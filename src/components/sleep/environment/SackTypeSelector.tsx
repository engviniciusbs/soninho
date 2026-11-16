import { cn } from "@/lib/utils";
import { SACK_LABELS, type SleepSackType } from "@/lib/sleep/clothingRecommendation";
import { FIELD_LABEL, SACK_OPTIONS, TILE, TILE_OFF, TILE_ON } from "./options";

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
      <p className={FIELD_LABEL}>Saquinho de dormir</p>
      <div role="group" aria-label="Tipo de saquinho" className="grid grid-cols-4 gap-2">
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
              className={cn(TILE, "px-1", isActive ? TILE_ON : TILE_OFF)}
            >
              <span className="text-[13px] leading-tight font-bold">{shortLabel}</span>
              {tog && <span className="text-xs leading-tight font-semibold text-sn-mu">TOG {tog}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
