import { cn } from "@/lib/utils";
import type { SleepSession } from "@/types";

export interface SleepTimelineProps {
  /** Sleeps that touch the day; the parts outside it are cut off. */
  sessions: SleepSession[];
  /** Start of the day (inclusive) and of the next one (exclusive). */
  dayStart: Date;
  dayEnd: Date;
  /** Current time in ms: ends a sleep still running and places "agora". */
  now: number | null;
}

const TICKS = [0, 6, 12, 18];
/** A fixed mark this close to "agora" (fraction of the day) gives way to it. */
const TICK_GAP = 0.09;

interface Block {
  id: string;
  night: boolean;
  left: number;
  width: number;
}

function blocksOf({ sessions, dayStart, dayEnd, now }: SleepTimelineProps): Block[] {
  const from = dayStart.getTime();
  const span = dayEnd.getTime() - from;
  const blocks: Block[] = [];
  for (const s of sessions) {
    const start = Date.parse(s.start_time);
    const end = s.end_time ? Date.parse(s.end_time) : now;
    if (end === null) continue;
    const a = Math.max(start, from);
    const b = Math.min(end, dayEnd.getTime());
    if (b <= a) continue;
    blocks.push({
      id: s.id,
      night: s.type === "NIGHT_SLEEP",
      left: ((a - from) / span) * 100,
      width: ((b - a) / span) * 100,
    });
  }
  return blocks;
}

/**
 * The day's blocks band (mockup `.day` and `.ticks`): night in `sn-night`,
 * naps in `sn-pr`, over the 24 hours of the day, with marks at 0h, 6h, 12h
 * and 18h, and "agora" while the day is today (24h otherwise).
 */
export function SleepTimeline(props: SleepTimelineProps) {
  const { dayStart, dayEnd, now } = props;
  const blocks = blocksOf(props);
  const span = dayEnd.getTime() - dayStart.getTime();
  const nowAt =
    now !== null && now >= dayStart.getTime() && now < dayEnd.getTime()
      ? (now - dayStart.getTime()) / span
      : null;
  const ticks = TICKS.filter((h) => nowAt === null || h === 0 || Math.abs(h / 24 - nowAt) >= TICK_GAP);

  return (
    <div data-slot="day-band" className="mt-3">
      <div aria-hidden="true" className="relative h-[26px] overflow-hidden rounded-md bg-sn-s2">
        {blocks.map((b) => (
          <i
            key={b.id}
            data-kind={b.night ? "night" : "nap"}
            className={cn("absolute inset-y-0 rounded-md", b.night ? "bg-sn-night" : "bg-sn-pr")}
            style={{ left: `${b.left}%`, width: `max(${b.width}%, 3px)` }}
          />
        ))}
        {nowAt !== null && (
          <i className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-sn-tx/70" style={{ left: `${nowAt * 100}%` }} />
        )}
      </div>
      <div aria-hidden="true" className="relative mt-1.5 h-4 font-sans text-[11px] font-semibold text-sn-mu tabular-nums">
        {ticks.map((h) => (
          <span
            key={h}
            className={cn("absolute top-0", h > 0 && "-translate-x-1/2")}
            style={{ left: `${(h / 24) * 100}%` }}
          >
            {h}h
          </span>
        ))}
        {nowAt === null ? (
          <span className="absolute top-0 right-0">24h</span>
        ) : (
          <span
            className={cn("absolute top-0", nowAt > 0.92 ? "right-0" : "-translate-x-1/2")}
            style={nowAt > 0.92 ? undefined : { left: `${nowAt * 100}%` }}
          >
            agora
          </span>
        )}
      </div>
    </div>
  );
}
