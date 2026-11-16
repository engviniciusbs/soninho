import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** Width in CSS pixels; the height keeps the 140:120 ratio. */
  size?: number;
}

/**
 * Sun with rays on the same dotted orbit and one star, in gold (`text-sn-sun`).
 * Decorative: marks the next sleep as a nap. Floats gently, still under
 * `prefers-reduced-motion`.
 */
export function SunOrbit({ className, size = 140 }: Props) {
  return (
    <svg
      width={size}
      height={Math.round((size * 120) / 140)}
      viewBox="0 0 140 120"
      aria-hidden="true"
      focusable="false"
      className={cn("text-sn-sun animate-sn-float motion-reduce:animate-none", className)}
    >
      <ellipse
        cx="72"
        cy="62"
        rx="62"
        ry="30"
        transform="rotate(-28 72 62)"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".5"
        strokeWidth="1.4"
        strokeDasharray="3 5"
      />
      <circle
        cx="74"
        cy="58"
        r="24"
        fill="currentColor"
        style={{ filter: "drop-shadow(0 0 18px var(--sn-sun-glow))" }}
      />
      <path
        d="M74 22v-6M74 100v-6M38 58h-6M116 58h-6M48.5 32.5l-4-4M103.5 87.5l-4-4M48.5 83.5l-4 4M103.5 28.5l-4 4"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M116 96c.4 3 1.8 4.4 4.8 4.8-3 .4-4.4 1.8-4.8 4.8-.4-3-1.8-4.4-4.8-4.8 3-.4 4.4-1.8 4.8-4.8Z"
        fill="currentColor"
      />
    </svg>
  );
}
