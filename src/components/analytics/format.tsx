import { formatDuration } from "@/lib/utils";

export { formatDecimal } from "@/lib/format/number";

/** Hours (possibly fractional) as a duration: 10.9 → "10h 54min", never "10,9h". */
export function formatHours(hours: number): string {
  return formatDuration(hours * 60);
}

/** A duration as a figure ("12h 10min"), the unit "min" set smaller so it fits a narrow tile. */
export function DurationFigure({ minutes }: { minutes: number }) {
  const text = formatDuration(minutes);
  if (!text.endsWith("min")) return <>{text}</>;
  return (
    <>
      {text.slice(0, -3).trimEnd()}
      <span className="ml-px font-sans text-[0.55em] font-bold text-sn-mu">min</span>
    </>
  );
}
