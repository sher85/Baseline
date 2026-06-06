"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type WorkoutFrequencySeries = {
  key: string;
  label: string;
};

type WorkoutFrequencyChartProps = {
  average: number;
  data: Array<Record<string, number | string>>;
  series: WorkoutFrequencySeries[];
};

const SERIES_COLORS = [
  "var(--accent)",
  "#d4815f",
  "#4f8f70",
  "#6f89c9",
  "#c0a24c",
  "var(--muted)"
];

export function WorkoutFrequencyChart({
  average,
  data,
  series
}: WorkoutFrequencyChartProps) {
  const hasData = data.some((item) => typeof item.total === "number" && item.total > 0);

  if (!hasData || !series.length) {
    return (
      <div className="chart-empty">
        <strong>Workout Frequency Will Appear After Sessions Have Synced.</strong>
        <span className="metric-detail">
          Once Baseline has workout sessions, this bar chart will split them by activity type.
        </span>
      </div>
    );
  }

  return (
    <div className="chart-frame chart-frame-with-legend">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 18, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--border-strong)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: "var(--panel-strong)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              color: "var(--foreground)",
              boxShadow: "var(--shadow)"
            }}
            formatter={(value, name) => [
              typeof value === "number" ? value.toFixed(0) : value,
              name
            ]}
            labelFormatter={(value) => `Workout Frequency • ${value}`}
          />
          <ReferenceLine
            y={average}
            stroke="var(--foreground)"
            strokeDasharray="6 5"
            strokeOpacity={0.72}
            label={{
              value: `Avg ${average.toFixed(1)}`,
              fill: "var(--foreground)",
              fontSize: 12,
              position: "insideTopRight"
            }}
          />
          {series.map((entry, index) => (
            <Bar
              key={entry.key}
              dataKey={entry.key}
              name={entry.label}
              stackId="workouts"
              fill={SERIES_COLORS[index % SERIES_COLORS.length]}
              radius={index === series.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        {series.map((entry, index) => (
          <span key={entry.key} className="chart-legend-item">
            <span
              className="chart-legend-swatch"
              style={{ background: SERIES_COLORS[index % SERIES_COLORS.length] }}
            />
            {entry.label}
          </span>
        ))}
      </div>
    </div>
  );
}
