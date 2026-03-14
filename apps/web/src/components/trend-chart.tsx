"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type TrendChartProps = {
  color?: string;
  data: Array<Record<string, number | string | null>>;
  dataKey: string;
  decimals?: number;
  label: string;
  suffix?: string;
};

function defaultFormatter(value: number | null, decimals = 0, suffix = "") {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${value.toFixed(decimals)}${suffix}`;
}

export function TrendChart({
  color = "var(--accent)",
  data,
  dataKey,
  label,
  decimals = 0,
  suffix = ""
}: TrendChartProps) {
  const hasData = data.some((item) => {
    const value = item[dataKey];

    return typeof value === "number" && Number.isFinite(value);
  });

  if (!hasData) {
    return (
      <div className="chart-empty">
        <strong>{label} will appear after more sync history accumulates.</strong>
        <span className="metric-detail">
          Once the local API has enough data for this surface, the trend chart will render here.
        </span>
      </div>
    );
  }

  return (
    <div className="chart-frame">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 16, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.34} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            formatter={(value: number | string) =>
              defaultFormatter(Number(value), decimals, suffix)
            }
            labelFormatter={(value) => `${label} • ${value}`}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            fill={`url(#fill-${dataKey})`}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
