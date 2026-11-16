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

interface Props {
  /** One point per day; `null` leaves a gap (no data that day). */
  data: { date: string; avgDuration: number | null }[];
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
  label = "Duração média (min)",
  color = "var(--sn-pr)",
  unit = "min",
  domain,
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={RULE} />
        <XAxis
          dataKey="date"
          tick={{ fill: MUTED, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: RULE }}
          interval="preserveStartEnd"
          minTickGap={18}
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
          formatter={(v) => `${Number(v).toLocaleString("pt-BR")}${unit}`}
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
  );
}
