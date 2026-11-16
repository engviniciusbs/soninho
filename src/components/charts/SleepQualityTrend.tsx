"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatValue, INITIAL_SIZE, todayLabel } from "./chartText";

interface Props {
  /** One point per day; `null` leaves a gap (no data that day). */
  data: { date: string; avgDuration: number | null }[];
  /**
   * Names the text alternative. Pass `labelledBy`, the id of the visible
   * title, so the name is not read twice; `caption` is the fallback when the
   * chart has no visible title.
   */
  labelledBy?: string;
  caption?: string;
  /** Header of the value column in the text alternative, naming the measure. */
  valueHeader?: string;
  label?: string;
  /** A colour token, e.g. `var(--sn-night)`. */
  color?: string;
  unit?: string;
  /** Fixed y range, e.g. `[1, 5]` for a 1 to 5 rating. */
  domain?: [number, number];
}

const RULE = "var(--sn-bd)";
const MUTED = "var(--sn-mu)";

export function SleepQualityTrend({
  data,
  labelledBy,
  caption,
  valueHeader = "Valor",
  label = "Duração média (min)",
  color = "var(--sn-pr)",
  unit = "min",
  domain,
}: Props) {
  const dayLabel = todayLabel(data);
  return (
    <>
      {/* The SVG is decorative for assistive tech: the table carries the same values. */}
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={180} initialDimension={INITIAL_SIZE}>
          <LineChart accessibilityLayer={false} data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={RULE} />
            <XAxis
              dataKey="date"
              tick={{ fill: MUTED, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: RULE }}
              interval="preserveStartEnd"
              minTickGap={18}
              // Today is still running: name it, so its point is not read as final.
              tickFormatter={dayLabel}
            />
            <YAxis
              tick={{ fill: MUTED, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              unit={unit}
              width={44}
              tickCount={4}
              domain={domain}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(v) => formatValue(Number(v), unit)}
              labelFormatter={(l) => dayLabel(String(l))}
              separator=": "
              contentStyle={{
                backgroundColor: "var(--sn-s1)",
                border: `1px solid ${RULE}`,
                borderRadius: 12,
                color: "var(--sn-tx)",
              }}
              labelStyle={{ color: MUTED }}
              itemStyle={{ color: "var(--sn-tx)" }}
            />
            <Line
              type="monotone"
              dataKey="avgDuration"
              name={label}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, stroke: color, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only" aria-labelledby={labelledBy}>
        {!labelledBy && caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">{valueHeader}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{dayLabel(d.date)}</th>
              <td>{d.avgDuration === null ? "sem dado" : formatValue(d.avgDuration, unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
