import { useId } from "react";
import { IconMinus, IconPlus } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";
import { formatDecimal } from "@/lib/format/number";
import { FIELD_LABEL } from "./options";

/** Colour of the reading, from the tokens; the number itself carries the meaning. */
function tempTone(temp: number): string {
  if (temp >= 28) return "text-sn-danger";
  if (temp >= 24) return "text-sn-warn";
  if (temp >= 20) return "text-sn-ok";
  return "text-sn-pr";
}

// ─── Temperature stepper ──────────────────────────────────────────────────────
export function TempStepper({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const labelId = useId();
  const temp = value ?? 22;

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <p id={labelId} className={FIELD_LABEL}>
        Temperatura do quarto
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Diminuir temperatura"
          onClick={() => onChange(Math.max(10, temp - 0.5))}
        >
          <IconMinus size={20} />
        </Button>

        <div className="flex flex-1 items-baseline justify-center gap-1">
          <span
            className={cn("font-display text-[34px] leading-none font-bold tabular-nums", value === null ? "text-sn-mu" : tempTone(temp))}
            aria-live="polite"
            aria-atomic="true"
          >
            {value === null ? "—" : formatDecimal(temp, 1, { fixed: true })}
          </span>
          <span className="font-sans text-base font-bold text-sn-mu">°C</span>
        </div>

        <Button
          variant="secondary"
          size="icon"
          aria-label="Aumentar temperatura"
          onClick={() => onChange(Math.min(40, temp + 0.5))}
        >
          <IconPlus size={20} />
        </Button>
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-2">
        {[18, 20, 22, 24, 26, 28].map((t) => (
          <Chip
            key={t}
            aria-label={`Definir temperatura como ${t}°C`}
            selected={value === t}
            onClick={() => onChange(t)}
          >
            {t}°
          </Chip>
        ))}
        {value !== null && (
          <Button
            variant="ghost"
            size="xs"
            aria-label="Limpar temperatura"
            onClick={() => onChange(null)}
          >
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
