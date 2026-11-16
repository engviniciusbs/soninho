import { formatDuration } from "@/lib/utils";

/** A decimal in PT-BR ("2,4"), at most one decimal place. */
export function formatDecimal(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/** Hours with a PT-BR decimal ("1,5h"). */
export function formatHours(n: number): string {
  return `${formatDecimal(n)}h`;
}

/** A duration as a figure ("12h 10min"), the unit "min" set smaller so it fits a narrow tile. */
export function DurationFigure({ minutes }: { minutes: number }) {
  const text = formatDuration(minutes);
  if (!text.endsWith("min")) return <>{text}</>;
  return (
    <>
      {text.slice(0, -3)}
      <span className="ml-px font-sans text-[0.55em] font-bold text-sn-mu">min</span>
    </>
  );
}
