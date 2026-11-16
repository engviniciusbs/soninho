import { Chip } from "@/components/ui/chip";
import { TOG_OPTIONS, type SleepSackType } from "@/lib/sleep/clothingRecommendation";
import { FIELD_LABEL } from "./options";
import { formatDecimal } from "@/lib/format/number";

// ─── TOG selector — only when a sack is selected ──────────────────────────────
export function TogSelector({
  sackType,
  value,
  onSelect,
}: {
  sackType: SleepSackType | null;
  value: number | null;
  onSelect: (tog: number) => void;
}) {
  if (!sackType || sackType === "none") return null;
  return (
    <div className="space-y-2">
      <p className={FIELD_LABEL}>TOG do saquinho</p>
      <div role="group" aria-label="TOG do saquinho" className="flex flex-wrap gap-2">
        {TOG_OPTIONS.map((t) => (
          <Chip
            key={t}
            aria-label={`TOG ${formatDecimal(t)}`}
            selected={value === t}
            onClick={() => onSelect(t)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(t); }}
          >
            {formatDecimal(t)}
          </Chip>
        ))}
      </div>
    </div>
  );
}
