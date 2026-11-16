import type { ReactNode } from "react";

/**
 * Soninho line icons: one family, 24px grid, 1.8 stroke, `currentColor`.
 * Drawn from the icon sprites of the approved redesign mockups
 * (docs/superpowers/specs/assets/2026-11-16-redesign/). Always decorative:
 * the control that holds one carries the accessible name.
 */
export interface IconProps {
  /** CSS pixel size (square). */
  size?: number;
  className?: string;
}

const STROKE = 1.8;

function make(displayName: string, paths: ReactNode) {
  function Icon({ size = 24, className }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={className}
      >
        {paths}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}

export const IconHome = make(
  "IconHome",
  <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z" />
);

export const IconBottle = make(
  "IconBottle",
  <>
    <path d="M10 2.5h4v3h-4z" />
    <path d="M9 5.5h6l1.5 3V20a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 20V8.5L9 5.5Z" />
    <path d="M7.5 12h9" />
  </>
);

export const IconList = make(
  "IconList",
  <>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r=".9" fill="currentColor" />
    <circle cx="4.5" cy="12" r=".9" fill="currentColor" />
    <circle cx="4.5" cy="18" r=".9" fill="currentColor" />
  </>
);

export const IconChart = make(
  "IconChart",
  <>
    <path d="M4 4v16h16" />
    <path d="M8.5 16v-5M12.5 16V8M16.5 16v-3" />
  </>
);

export const IconMore = make(
  "IconMore",
  <g fill="currentColor" stroke="none">
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </g>
);

export const IconMoon = make(
  "IconMoon",
  <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
);

export const IconSun = make(
  "IconSun",
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </>
);

export const IconPlay = make("IconPlay", <path d="M7 4.5v15l12-7.5-12-7.5Z" />);

export const IconStop = make(
  "IconStop",
  <rect x="6" y="6" width="12" height="12" rx="2.5" />
);

export const IconClock = make(
  "IconClock",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>
);

export const IconChevronRight = make("IconChevronRight", <path d="m9 5 7 7-7 7" />);

export const IconChevronLeft = make("IconChevronLeft", <path d="m15 5-7 7 7 7" />);

export const IconSpark = make(
  "IconSpark",
  <path
    d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z"
    fill="currentColor"
    stroke="none"
  />
);

export const IconPlus = make("IconPlus", <path d="M12 5v14M5 12h14" />);

export const IconPen = make("IconPen", <path d="M4 20h4L19 9l-4-4L4 16v4Z" />);

export const IconChat = make("IconChat", <path d="M4 5.5h16v10H9l-5 4v-14Z" />);

export const IconUsers = make(
  "IconUsers",
  <>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M16 14.2c2.4.2 4 1.8 4.5 4.8" />
  </>
);

export const IconBell = make(
  "IconBell",
  <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15l1.5-2ZM10 20.5h4" />
);

export const IconGear = make(
  "IconGear",
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
  </>
);

export const IconDoc = make(
  "IconDoc",
  <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20V3.5ZM14 3.5v4h4M9.5 12h6M9.5 15.5h6" />
);

export const IconBaby = make(
  "IconBaby",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="9.3" cy="11" r=".9" fill="currentColor" />
    <circle cx="14.7" cy="11" r=".9" fill="currentColor" />
    <path d="M9.5 15c1.4 1.2 3.6 1.2 5 0" />
  </>
);

export const IconLogout = make(
  "IconLogout",
  <path d="M14 4.5H6.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1H14M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5" />
);
