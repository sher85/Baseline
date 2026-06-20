"use client";

import {
  Bar,
  CartesianGrid,
  Line,
  ComposedChart,
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
  data: Array<Record<string, number | string | null>>;
  series: WorkoutFrequencySeries[];
  syncId?: string;
};

const SERIES_COLORS = [
  "var(--accent)",
  "#d4815f",
  "#4f8f70",
  "#6f89c9",
  "#c0a24c",
  "var(--muted)"
];

const SERIES_COLOR_BY_KEY: Record<string, string> = {
  kayaking: "#6f89c9",
  other: "var(--muted)",
  pickleball: "#a981ce",
  running: "var(--accent)",
  unmapped: "var(--muted)",
  weight_lifting: "#d4815f"
};

function getSeriesColor(entry: WorkoutFrequencySeries, index: number) {
  return SERIES_COLOR_BY_KEY[entry.key] ?? SERIES_COLORS[index % SERIES_COLORS.length];
}

export function WorkoutFrequencyChart({
  data,
  series,
  syncId
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
      <div className="chart-legend chart-legend-prominent" aria-label="Workout Frequency Legend">
        <span className="chart-legend-title">Legend</span>
        {series.map((entry, index) => (
          <span key={entry.key} className="chart-legend-item chart-legend-pill">
            <span
              className="chart-legend-swatch"
              style={{ background: getSeriesColor(entry, index) }}
            />
            {entry.label}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={data}
          margin={{ top: 18, right: 8, left: -18, bottom: 0 }}
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
            content={({ active, label, payload }) => {
              if (!active || !payload?.length) {
                return null;
              }

              const values = new Map(
                payload.map((entry) => [entry.dataKey, Number(entry.value ?? 0)])
              );
              const orderedSeries = [...series].reverse().filter((entry) => {
                const value = values.get(entry.key);

                return value !== undefined && value > 0;
              });
              const movingAverage = values.get("ema");

              return (
                <div className="chart-tooltip">
                  <strong>Workout Frequency • {label}</strong>
                  {orderedSeries.map((entry) => (
                    <span key={entry.key} className="chart-tooltip-row">
                      <span
                        className="chart-legend-swatch"
                        style={{ background: getSeriesColor(entry, series.indexOf(entry)) }}
                      />
                      {entry.label}: {values.get(entry.key)?.toFixed(0)}
                    </span>
                  ))}
                  {movingAverage !== undefined && Number.isFinite(movingAverage) ? (
                    <span className="chart-tooltip-row chart-tooltip-muted">
                      Moving Average: {movingAverage.toFixed(1)}
                    </span>
                  ) : null}
                </div>
              );
            }}
          />
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
          {series.map((entry, index) => (
            <Bar
              key={entry.key}
              dataKey={entry.key}
              name={entry.label}
              stackId="workouts"
              fill={getSeriesColor(entry, index)}
              radius={[0, 0, 0, 0]}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
