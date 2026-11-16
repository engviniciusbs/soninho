import { cn } from "@/lib/utils";

type SoninhoLogoMarkProps = {
  /** CSS pixel size (square) */
  size?: number;
  className?: string;
  /** When false, mark is decorative (e.g. next to word “Soninho”) */
  hideLabel?: boolean;
};

/**
 * Soninho symbol: the line crescent of the brand icon family, in lavender
 * (`text-sn-pr`), as in the approved redesign mockups.
 */
export function SoninhoLogoMark({
  size = 32,
  className,
  hideLabel = true,
}: SoninhoLogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      role="img"
      aria-hidden={hideLabel}
      aria-label={hideLabel ? undefined : "Soninho"}
      focusable="false"
      className={cn("shrink-0 text-sn-pr", className)}
    >
      {!hideLabel ? <title>Soninho</title> : null}
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  );
}
