"use client";

import { useState } from "react";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { lastDayKeysInTimeZone } from "@/lib/sleep/sessionDayAllocation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconChevronLeft, IconChevronRight } from "@/components/brand/icons";

/** Weekday labels by ISO day number (1 = Monday), as in the mockup. */
const WEEKDAY = ["", "seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

/** How far back the strip goes. */
export const WEEK_STRIP_DAYS = 30;

const WEEK = 7;

export interface WeekStripProps {
  selected: Date;
  onSelect: (day: Date) => void;
  timeZone: string;
}

/**
 * Index range [start, end) of week `w` (0 = the week ending today) in `count`
 * days. Pages never overlap: when `count` is not a multiple of 7, the oldest
 * page is shorter (30 days: four weeks and the 2 oldest days).
 */
function weekRange(w: number, count: number): [number, number] {
  const end = count - WEEK * w;
  return [Math.max(0, end - WEEK), end];
}

const lastWeek = (count: number) => Math.ceil(count / WEEK) - 1;

function weekOf(index: number, count: number): number {
  for (let w = 0; w <= lastWeek(count); w++) {
    const [a, b] = weekRange(w, count);
    if (index >= a && index < b) return w;
  }
  return 0;
}

/**
 * Day picker (mockup `.week`): seven days, the current week ending today
 * ("hoje"). "Semana anterior" and "Próxima semana" page back up to 30 days;
 * the oldest page holds only the days left, set against the right edge so
 * each day keeps its column next to the following week. A selected day in an
 * older week opens that week. `onSelect` gets the
 * start of the tapped day in `timeZone`.
 */
export function WeekStrip({ selected, onSelect, timeZone }: WeekStripProps) {
  const keys = lastDayKeysInTimeZone(WEEK_STRIP_DAYS, timeZone, new Date());
  const todayKey = keys[keys.length - 1];
  const selectedKey = formatInTimeZone(selected, timeZone, "yyyy-MM-dd");
  const selectedIndex = keys.indexOf(selectedKey);
  const selectedWeek = selectedIndex === -1 ? 0 : weekOf(selectedIndex, keys.length);

  // Paging is local; when the selected day changes, its week shows again.
  const [paged, setPaged] = useState<{ key: string; week: number } | null>(null);
  const week = paged && paged.key === selectedKey ? paged.week : selectedWeek;
  const [from, to] = weekRange(week, keys.length);
  const shown = keys.slice(from, to);
  const go = (w: number) => setPaged({ key: selectedKey, week: w });

  const dayMonth = (k: string) =>
    formatInTimeZone(fromZonedTime(`${k}T12:00:00`, timeZone), timeZone, "d 'de' MMMM", { locale: ptBR });
  const range = `${dayMonth(shown[0])} a ${dayMonth(shown[shown.length - 1])}`;

  return (
    <div className="mb-3">
      <div className="-mx-2 mb-1 flex items-center justify-between">
        <Button
          variant="icon"
          aria-label="Semana anterior"
          disabled={week >= lastWeek(keys.length)}
          onClick={() => go(week + 1)}
        >
          <IconChevronLeft size={20} />
        </Button>
        <p aria-live="polite" className="font-sans text-sm font-bold text-sn-mu">
          {range}
        </p>
        <Button
          variant="icon"
          aria-label="Próxima semana"
          disabled={week === 0}
          onClick={() => go(week - 1)}
        >
          <IconChevronRight size={20} />
        </Button>
      </div>
      <div role="group" aria-label="Escolher o dia" className="grid grid-cols-7">
        {shown.map((k, i) => {
          const start = fromZonedTime(`${k}T00:00:00`, timeZone);
          // Noon keeps the weekday right whatever the offset.
          const noon = fromZonedTime(`${k}T12:00:00`, timeZone);
          const isToday = k === todayKey;
          const isSelected = k === selectedKey;
          const dayName = formatInTimeZone(noon, timeZone, "EEEE, d 'de' MMMM", { locale: ptBR }).replace("-feira", "");
          return (
            <button
              key={k}
              type="button"
              aria-current={isSelected ? "date" : undefined}
              aria-label={isToday ? `Hoje, ${formatInTimeZone(noon, timeZone, "d 'de' MMMM", { locale: ptBR })}` : dayName}
              onClick={() => onSelect(start)}
              style={i === 0 && shown.length < WEEK ? { gridColumnStart: WEEK - shown.length + 1 } : undefined}
              className={cn(
                "flex min-h-11 cursor-pointer flex-col items-center gap-1 rounded-2xl py-2 font-sans text-xs font-bold outline-none",
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
    </div>
  );
}
