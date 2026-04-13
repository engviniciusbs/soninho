"use client";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6h–19h

interface Props {
  data: { dayOfWeek: number; hour: number; count: number }[];
}

export function NapPatternHeatmap({ data }: Props) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  function getOpacity(dayOfWeek: number, hour: number) {
    const entry = data.find(
      (d) => d.dayOfWeek === dayOfWeek && d.hour === hour
    );
    if (!entry) return 0;
    return 0.2 + (entry.count / maxCount) * 0.8;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[400px]">
        <div className="grid gap-1" style={{ gridTemplateColumns: `60px repeat(${HOURS.length}, 1fr)` }}>
          <div />
          {HOURS.map((h) => (
            <div
              key={h}
              className="text-[10px] text-muted-foreground text-center"
            >
              {h}h
            </div>
          ))}

          {DAYS.map((day, dayIdx) => (
            <div key={day} className="contents">
              <div className="text-xs text-muted-foreground flex items-center">
                {day}
              </div>
              {HOURS.map((hour) => (
                <div
                  key={`${dayIdx}-${hour}`}
                  className="aspect-square rounded-sm"
                  style={{
                    backgroundColor: `rgba(196, 181, 253, ${getOpacity(dayIdx, hour)})`,
                    minHeight: 16,
                  }}
                  title={`${day} ${hour}h: ${
                    data.find(
                      (d) => d.dayOfWeek === dayIdx && d.hour === hour
                    )?.count ?? 0
                  } sonecas`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
