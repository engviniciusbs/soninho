"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

interface Props {
  data: { date: string; napHours: number; nightHours: number }[];
  recommendedHours?: number;
}

export function SleepBarChart({ data, recommendedHours = 14 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} unit="h" />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 12,
            color: "#e2e8f0",
          }}
        />
        <Legend />
        <ReferenceLine
          y={recommendedHours}
          stroke="#6366f1"
          strokeDasharray="5 5"
          label={{
            value: "Recomendado",
            fill: "#6366f1",
            fontSize: 11,
          }}
        />
        <Bar
          dataKey="nightHours"
          name="Noturno"
          fill="#93c5fd"
          radius={[4, 4, 0, 0]}
          stackId="sleep"
        />
        <Bar
          dataKey="napHours"
          name="Sonecas"
          fill="#c4b5fd"
          radius={[4, 4, 0, 0]}
          stackId="sleep"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
