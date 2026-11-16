"use client";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6h–19h

interface Props {
  data: { dayOfWeek: number; hour: number; count: number }[];
}

/** Naps by weekday and start hour: a lavender cell, stronger with more naps, on the track colour. */
export function NapPatternHeatmap({ data }: Props) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const countAt = (dayOfWeek: number, hour: number) =>
    data.find((d) => d.dayOfWeek === dayOfWeek && d.hour === hour)?.count ?? 0;

  return (
    <div
      className="grid gap-[3px]"
      style={{ gridTemplateColumns: `2.25rem repeat(${HOURS.length}, minmax(0, 1fr))` }}
    >
      <div />
      {HOURS.map((h) => (
        <div key={h} className="text-center font-sans text-xs font-semibold text-sn-mu tabular-nums">
          {h % 3 === 0 ? `${h}h` : ""}
        </div>
      ))}

      {DAYS.map((day, dayIdx) => (
        <div key={day} className="contents">
          <div className="flex items-center font-sans text-[13px] font-semibold text-sn-mu">{day}</div>
          {HOURS.map((hour) => {
            const count = countAt(dayIdx, hour);
            return (
              <div
                key={`${dayIdx}-${hour}`}
                className="relative aspect-square min-h-4 overflow-hidden rounded-[3px] bg-sn-s2"
                title={`${day} ${hour}h: ${count} ${count === 1 ? "soneca" : "sonecas"}`}
              >
                {count > 0 && (
                  <span
                    className="absolute inset-0 bg-sn-pr"
                    style={{ opacity: 0.2 + (count / maxCount) * 0.8 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
