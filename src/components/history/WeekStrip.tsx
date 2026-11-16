"use client";

import { useEffect, useRef } from "react";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { lastDayKeysInTimeZone } from "@/lib/sleep/sessionDayAllocation";
import { cn } from "@/lib/utils";

/** Weekday labels by ISO day number (1 = Monday), as in the mockup. */
const WEEKDAY = ["", "seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

/** How far back the strip scrolls. */
export const WEEK_STRIP_DAYS = 30;

export interface WeekStripProps {
  selected: Date;
  onSelect: (day: Date) => void;
  timeZone: string;
}

/**
 * Day picker (mockup `.week`): seven days fit, ending today ("hoje"); the
 * earlier days, up to 30 back, come by scrolling sideways. `onSelect` gets
 * the start of the tapped day in `timeZone`.
 */
export function WeekStrip({ selected, onSelect, timeZone }: WeekStripProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLButtonElement>(null);
  const keys = lastDayKeysInTimeZone(WEEK_STRIP_DAYS, timeZone, new Date());
  const todayKey = keys[keys.length - 1];
  const selectedKey = formatInTimeZone(selected, timeZone, "yyyy-MM-dd");

  // Keep the chosen day in view (on mount, the last week).
  useEffect(() => {
    const box = scroller.current;
    const day = current.current;
    if (!box || !day) return;
    const left = day.offsetLeft - box.offsetLeft;
    if (left < box.scrollLeft || left + day.offsetWidth > box.scrollLeft + box.clientWidth) {
      box.scrollLeft = left + day.offsetWidth - box.clientWidth;
    }
  }, [selectedKey]);

  return (
    <div
      ref={scroller}
      role="group"
      aria-label="Escolher o dia"
      className="-mx-1 mb-3 flex snap-x snap-mandatory overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {keys.map((k) => {
        const start = fromZonedTime(`${k}T00:00:00`, timeZone);
        // Noon keeps the weekday right whatever the offset.
        const noon = fromZonedTime(`${k}T12:00:00`, timeZone);
        const isToday = k === todayKey;
        const isSelected = k === selectedKey;
        const dayName = formatInTimeZone(noon, timeZone, "EEEE, d 'de' MMMM", { locale: ptBR }).replace(
          "-feira",
          ""
        );
        return (
          <button
            key={k}
            ref={isSelected ? current : undefined}
            type="button"
            aria-current={isSelected ? "date" : undefined}
            aria-label={isToday ? `Hoje, ${formatInTimeZone(noon, timeZone, "d 'de' MMMM", { locale: ptBR })}` : dayName}
            onClick={() => onSelect(start)}
            className={cn(
              "flex min-h-11 shrink-0 basis-[calc(100%/7)] snap-end cursor-pointer flex-col items-center gap-1 rounded-2xl py-2 font-sans text-xs font-bold outline-none",
              "transition-transform duration-(--sn-dur-micro) ease-sn-out active:scale-[0.96] motion-reduce:transition-none",
              "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sn-pr disabled:pointer-events-none disabled:opacity-55",
              isSelected ? "bg-sn-pr text-sn-pr-ink" : "text-sn-mu hover:bg-sn-s2/60"
            )}
          >
            <span>{isToday ? "hoje" : WEEKDAY[Number(formatInTimeZone(noon, timeZone, "i"))]}</span>
            <b
              className={cn(
                "font-display text-[17px] leading-none font-bold tabular-nums",
                isSelected ? "text-sn-pr-ink" : "text-sn-tx"
              )}
            >
              {formatInTimeZone(noon, timeZone, "d")}
            </b>
          </button>
        );
      })}
    </div>
  );
}
