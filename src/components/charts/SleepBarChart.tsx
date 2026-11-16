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
} from "recharts";
import { formatValue, INITIAL_SIZE, todayLabel } from "./chartText";

interface Props {
  data: { date: string; napHours: number; nightHours: number }[];
  recommendedHours?: number;
  /** Id of the visible title; names the table so it is not read twice. */
  labelledBy?: string;
}

// Colours come from the tokens (globals.css), never literals.
const NIGHT = "var(--sn-night)";
const NAP = "var(--sn-pr)";
const RULE = "var(--sn-bd)";
const MUTED = "var(--sn-mu)";

const hours = (v: number) => formatValue(v, "h");

/**
 * "Sono por dia": night (bottom) and naps stacked per day, with the
 * age target as a reference line. The legend sits below, outside the SVG.
 */
export function SleepBarChart({ data, recommendedHours = 14, labelledBy }: Props) {
  const dayLabel = todayLabel(data);
  return (
    <div className="flex flex-col gap-3">
      {/* The SVG is decorative for assistive tech: the table below carries the same values. */}
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={180} initialDimension={INITIAL_SIZE}>
          <BarChart accessibilityLayer={false} data={data} barCategoryGap="22%" margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={RULE} />
            <XAxis
              dataKey="date"
              tick={{ fill: MUTED, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: RULE }}
              interval="preserveStartEnd"
              minTickGap={18}
              // Today is still running: name it, so its short bar is not read as a bad day.
              tickFormatter={dayLabel}
            />
            <YAxis
              tick={{ fill: MUTED, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}h`}
              width={34}
              tickCount={4}
            />
            <Tooltip
              cursor={{ fill: "var(--sn-s2)", fillOpacity: 0.5 }}
              formatter={(v) => hours(Number(v))}
              separator=": "
              labelFormatter={(l) => dayLabel(String(l))}
              contentStyle={{
                backgroundColor: "var(--sn-s1)",
                border: `1px solid ${RULE}`,
                borderRadius: 12,
                color: "var(--sn-tx)",
              }}
              labelStyle={{ color: MUTED }}
              itemStyle={{ color: "var(--sn-tx)" }}
            />
            <ReferenceLine y={recommendedHours} stroke={MUTED} strokeDasharray="4 4" ifOverflow="extendDomain" />
            <Bar dataKey="nightHours" name="Noite" fill={NIGHT} stackId="sleep" maxBarSize={24} />
            <Bar dataKey="napHours" name="Sonecas" fill={NAP} radius={[2, 2, 0, 0]} stackId="sleep" maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only" aria-labelledby={labelledBy}>
        {!labelledBy && <caption>Sono por dia</caption>}
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Noite</th>
            <th scope="col">Sonecas</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{dayLabel(d.date)}</th>
              <td>{hours(d.nightHours)}</td>
              <td>{hours(d.napHours)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul aria-label="Legenda" className="flex flex-wrap gap-x-4 gap-y-1 font-sans text-[13px] font-semibold text-sn-mu">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-sn-night" />
          Noite
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-sn-pr" />
          Sonecas
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="w-3.5 border-t border-dashed border-sn-mu" />
          Meta para a idade, {hours(recommendedHours)}
        </li>
      </ul>
    </div>
  );
}
