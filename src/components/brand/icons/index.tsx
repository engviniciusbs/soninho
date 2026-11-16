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

export const IconMinus = make("IconMinus", <path d="M5 12h14" />);

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

export const IconTrash = make(
  "IconTrash",
  <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13M10.5 10.5v6M13.5 10.5v6" />
);

export const IconSend = make("IconSend", <path d="M4 11.5 20 4l-5.5 16-3-6.5L4 11.5ZM11.5 13.5 20 4" />);

export const IconRefresh = make(
  "IconRefresh",
  <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4.2h-4.2" />
);

export const IconDownload = make(
  "IconDownload",
  <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
);

export const IconThumbUp = make(
  "IconThumbUp",
  <path d="M7.5 10.5v9h-3v-9h3ZM7.5 10.5l3.6-6.3a1.6 1.6 0 0 1 3 .9l-.6 3.9h5a1.5 1.5 0 0 1 1.5 1.8l-1.4 7a1.5 1.5 0 0 1-1.5 1.2H7.5" />
);

export const IconThumbDown = make(
  "IconThumbDown",
  <path d="M16.5 13.5v-9h3v9h-3ZM16.5 13.5l-3.6 6.3a1.6 1.6 0 0 1-3-.9l.6-3.9h-5A1.5 1.5 0 0 1 4 13.2l1.4-7A1.5 1.5 0 0 1 6.9 5h9.6" />
);

export const IconAlert = make(
  "IconAlert",
  <>
    <path d="M12 4 21 19.5H3L12 4Z" />
    <path d="M12 10v4M12 17v.01" />
  </>
);

export const IconThermometer = make(
  "IconThermometer",
  <path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0ZM12 9v6.5" />
);

export const IconGrid = make(
  "IconGrid",
  <>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </>
);

export const IconStar = make(
  "IconStar",
  <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />
);

export const IconTrend = make("IconTrend", <path d="M4 17l5-5 4 3.5L20 8M15 8h5v5" />);

export const IconRadar = make(
  "IconRadar",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 12 18 6" />
  </>
);

export const IconCrown = make("IconCrown", <path d="M4.5 19h15M5 16 4 7.5l4.5 3.5L12 5l3.5 6L20 7.5 19 16H5Z" />);

export const IconShield = make(
  "IconShield",
  <>
    <path d="M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6l-7-2.5Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </>
);

export const IconEye = make(
  "IconEye",
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </>
);

export const IconUserPlus = make(
  "IconUserPlus",
  <>
    <circle cx="9.5" cy="8" r="3.2" />
    <path d="M3.5 19.5c.6-3.3 2.9-5.2 6-5.2s5.4 1.9 6 5.2M18.5 8.5v6M15.5 11.5h6" />
  </>
);

export const IconChevronDown = make("IconChevronDown", <path d="m5 9 7 7 7-7" />);

export const IconChevronUp = make("IconChevronUp", <path d="m5 15 7-7 7 7" />);

export const IconCheck = make("IconCheck", <path d="m5 12.5 4.5 4.5L19 7.5" />);

export const IconCopy = make(
  "IconCopy",
  <>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
  </>
);

export const IconLink = make(
  "IconLink",
  <>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </>
);

export const IconCloud = make(
  "IconCloud",
  <path d="M7 18.5h10.5a3.5 3.5 0 0 0 .6-6.95A5.5 5.5 0 0 0 7.4 10.1 4.2 4.2 0 0 0 7 18.5Z" />
);

export const IconRain = make(
  "IconRain",
  <>
    <path d="M7 14.5h10.5a3.5 3.5 0 0 0 .6-6.95A5.5 5.5 0 0 0 7.4 6.1 4.2 4.2 0 0 0 7 14.5Z" />
    <path d="m9 17.5-1 2.5M13 17.5l-1 2.5M17 17.5l-1 2.5" />
  </>
);

export const IconSnow = make(
  "IconSnow",
  <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />
);

export const IconWind = make(
  "IconWind",
  <path d="M3.5 9h11a2.5 2.5 0 1 0-2.5-2.5M3.5 13h15a2.5 2.5 0 1 1-2.5 2.5M3.5 17h7" />
);

export const IconShirt = make(
  "IconShirt",
  <path d="M9 3.5 4 6l1.5 4.5 2.5-1v11h8v-11l2.5 1L20 6l-5-2.5c-.4 1.4-1.6 2.5-3 2.5S9.4 4.9 9 3.5Z" />
);

export const IconX = make("IconX", <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" />);
