import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** Width in CSS pixels; the height keeps the 140:120 ratio. */
  size?: number;
}

/**
 * Crescent moon on a dotted orbit with two stars, in lavender (`text-sn-pr`).
 * Decorative: marks the next sleep as the night. Floats gently, still under
 * `prefers-reduced-motion`.
 */
export function MoonOrbit({ className, size = 140 }: Props) {
  return (
    <svg
      width={size}
      height={Math.round((size * 120) / 140)}
      viewBox="0 0 140 120"
      aria-hidden="true"
      focusable="false"
      className={cn("text-sn-pr animate-sn-float motion-reduce:animate-none", className)}
    >
      <ellipse
        cx="72"
        cy="62"
        rx="62"
        ry="30"
        transform="rotate(-28 72 62)"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".55"
        strokeWidth="1.4"
        strokeDasharray="3 5"
      />
      <path
        d="M98 74a30 30 0 1 1-23-47 24 24 0 1 0 23 47Z"
        fill="currentColor"
        style={{ filter: "drop-shadow(0 0 16px var(--sn-moon-glow))" }}
      />
      <path
        d="M112 22c.5 4 2.5 6 6.5 6.5-4 .5-6 2.5-6.5 6.5-.5-4-2.5-6-6.5-6.5 4-.5 6-2.5 6.5-6.5Z"
        fill="currentColor"
      />
      <path
        d="M26 92c.4 3 1.8 4.4 4.8 4.8-3 .4-4.4 1.8-4.8 4.8-.4-3-1.8-4.4-4.8-4.8 3-.4 4.4-1.8 4.8-4.8Z"
        fill="currentColor"
      />
    </svg>
  );
}
