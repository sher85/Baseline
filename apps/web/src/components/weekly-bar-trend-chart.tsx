"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type WeeklyBarTrendChartProps = {
  barColor?: string;
  data: Array<Record<string, number | string | null>>;
  decimals?: number;
  label: string;
  suffix?: string;
  syncId?: string;
};

function formatValue(value: number | null, decimals = 0, suffix = "") {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${value.toFixed(decimals)}${suffix}`;
}

export function WeeklyBarTrendChart({
  barColor = "var(--accent)",
  data,
  decimals = 0,
  label,
  suffix = "",
  syncId
}: WeeklyBarTrendChartProps) {
  const hasData = data.some((item) => {
    const value = item.value;

    return typeof value === "number" && Number.isFinite(value);
  });

  if (!hasData) {
    return (
      <div className="chart-empty">
        <strong>{label} Will Appear After More Sync History Accumulates.</strong>
        <span className="metric-detail">
          Once the local API has enough data for this surface, the weekly chart will render here.
        </span>
      </div>
    );
  }

  return (
    <div className="chart-frame">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={data}
          margin={{ top: 16, right: 6, left: -18, bottom: 0 }}
          {...(syncId ? { syncId } : {})}
        >
          <CartesianGrid stroke="var(--border-strong)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
          />
          <YAxis
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
            formatter={(value, name) => {
              const numericValue =
                typeof value === "number"
                  ? value
                  : value === null || value === undefined
                    ? null
                    : Number(value);

              return [
                formatValue(numericValue, decimals, suffix),
                name === "ema" ? "Moving Average" : label
              ];
            }}
            labelFormatter={(value) => `${label} • ${value}`}
          />
          <Bar dataKey="value" name={label} fill={barColor} radius={[8, 8, 0, 0]} />
          <Line
            type="monotone"
            dataKey="ema"
            name="Moving Average"
            stroke="var(--foreground)"
            strokeDasharray="6 5"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
