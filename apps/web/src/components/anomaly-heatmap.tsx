"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

import { formatOverviewDate } from "../lib/format";
import type { AnomalyHeatmapResponse } from "../services/analytics";

type AnomalyHeatmapProps = {
  categories: AnomalyHeatmapResponse["categories"];
  days: AnomalyHeatmapResponse["days"];
  filter: AnomalyHeatmapResponse["filter"];
  focusDay?: string | undefined;
  historyDays: number;
  range: AnomalyHeatmapResponse["range"];
};

type CalendarCell = {
  bucket: 0 | 1 | 2 | 3;
  data: AnomalyHeatmapResponse["days"][number] | null;
  date: string;
  inRange: boolean;
  inMonth?: boolean;
};

function bucketForScore(score: number): 0 | 1 | 2 | 3 {
  if (score <= 0) {
    return 0;
  }

  if (score <= 2) {
    return 1;
  }

  if (score <= 4) {
    return 2;
  }

  return 3;
}

function startOfWeek(day: Date) {
  const value = new Date(day);
  value.setUTCDate(value.getUTCDate() - value.getUTCDay());
  return value;
}

function endOfWeek(day: Date) {
  const value = startOfWeek(day);
  value.setUTCDate(value.getUTCDate() + 6);
  return value;
}

function startOfMonth(day: Date) {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
}

function endOfMonth(day: Date) {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0));
}

function buildWeeks(cells: CalendarCell[]) {
  const weeks: CalendarCell[][] = [];

  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return weeks;
}

function buildMonthBlocks(startDate: string, endDate: string, records: AnomalyHeatmapResponse["days"]) {
  const recordByDay = new Map(records.map((record) => [record.date, record]));
  const rangeStart = new Date(`${startDate}T00:00:00.000Z`);
  const rangeEnd = new Date(`${endDate}T00:00:00.000Z`);
  const blocks: Array<{
    key: string;
    label: string;
    weeks: CalendarCell[][];
  }> = [];

  for (
    const monthCursor = startOfMonth(rangeStart);
    monthCursor <= rangeEnd;
    monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1)
  ) {
    const monthStart = startOfMonth(monthCursor);
    const monthEnd = endOfMonth(monthCursor);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const cells: CalendarCell[] = [];

    for (
      const cursor = new Date(calendarStart);
      cursor <= calendarEnd;
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      const date = cursor.toISOString().slice(0, 10);
      const data = recordByDay.get(date) ?? null;
      cells.push({
        date,
        data,
        inMonth: cursor.getUTCMonth() === monthStart.getUTCMonth(),
        inRange: cursor >= rangeStart && cursor <= rangeEnd,
        bucket: bucketForScore(data?.score ?? 0)
      });
    }

    blocks.push({
      key: monthStart.toISOString(),
      label: new Intl.DateTimeFormat("en-US", {
        month: "long"
      }).format(monthStart),
      weeks: buildWeeks(cells)
    });
  }

  return blocks;
}

function severitySummary(day: AnomalyHeatmapResponse["days"][number]) {
  const parts = [];

  if (day.severityBreakdown.high) {
    parts.push(`${day.severityBreakdown.high} high`);
  }

  if (day.severityBreakdown.medium) {
    parts.push(`${day.severityBreakdown.medium} medium`);
  }

  if (day.severityBreakdown.low) {
    parts.push(`${day.severityBreakdown.low} low`);
  }

  return parts.join(" • ");
}

function heatmapToneClass(bucket: 0 | 1 | 2 | 3) {
  return bucket === 0
    ? "tone-0"
    : bucket === 1
      ? "tone-1"
      : bucket === 2
        ? "tone-2"
        : "tone-3";
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AnomalyHeatmap({
  categories,
  days,
  filter,
  focusDay,
  historyDays,
  range
}: AnomalyHeatmapProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const startDay = range.startDay;
  const endDay = range.endDay;

  if (!startDay || !endDay) {
    return null;
  }

  const monthBlocks = buildMonthBlocks(startDay, endDay, days);

  function pushParams(next: { focusDay?: string; range?: "3m" | "6m" | "12m"; type?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", next.range ?? filter.range);
    params.set("type", next.type ?? filter.category);
    params.set("historyDays", String(historyDays));

    if (next.focusDay) {
      params.set("focusDay", next.focusDay);
    } else {
      params.delete("focusDay");
    }

    const hash = next.focusDay ? `#anomaly-day-${next.focusDay}` : "";

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}${hash}`, { scroll: true });
    });
  }

  function renderHeatmapCell(cell: CalendarCell) {
    const isInteractive = Boolean(cell.data?.anomalyCount);

    return (
      <Tooltip.Root key={cell.date}>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            disabled={!isInteractive}
            className={[
              "heatmap-cell",
              heatmapToneClass(cell.bucket),
              cell.inRange ? "" : "outside-range",
              cell.inMonth === false ? "outside-month" : "",
              focusDay === cell.date ? "focused" : "",
              isInteractive ? "interactive" : "inactive"
            ].filter(Boolean).join(" ")}
            onClick={() => {
              if (!isInteractive) {
                return;
              }

              pushParams({ focusDay: cell.date });
            }}
            aria-label={
              cell.data
                ? `${formatOverviewDate(cell.date)} · load ${cell.data.score}`
                : formatOverviewDate(cell.date)
            }
          />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side="top" sideOffset={10} className="heatmap-tooltip">
            <strong>{formatOverviewDate(cell.date)}</strong>
            <span>Load score: {cell.data?.score ?? 0}</span>
            <span>Anomalies: {cell.data?.anomalyCount ?? 0}</span>
            {cell.data?.anomalyCount ? (
              <>
                <span>{severitySummary(cell.data)}</span>
                <span>{cell.data.summaries.join(" • ")}</span>
              </>
            ) : (
              <span>No anomaly flags recorded for this day.</span>
            )}
            <Tooltip.Arrow className="help-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  }

  return (
    <section className="heatmap-panel">
      <div className="heatmap-header">
        <div>
          <p className="eyebrow">Anomaly Load</p>
        </div>
        <p className="metric-detail">
          Weighted daily physiological load using anomaly severity across the selected range.
        </p>
      </div>

      <div className="heatmap-controls">
        <div className="segmented-control" role="tablist" aria-label="Heatmap range">
          {(["3m", "6m", "12m"] as const).map((rangeOption) => (
            <button
              key={rangeOption}
              type="button"
              className={`segmented-option${filter.range === rangeOption ? " active" : ""}`}
              onClick={() => pushParams({ range: rangeOption })}
            >
              {rangeOption}
            </button>
          ))}
        </div>

        <label className="filter-select">
          <span className="metric-label">Anomaly type</span>
          <select
            value={filter.category}
            onChange={(event) => pushParams({ type: event.target.value })}
          >
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Tooltip.Provider delayDuration={80}>
        <div className={`month-block-grid range-${filter.range}`}>
          {monthBlocks.map((month) => (
            <section key={month.key} className="month-block">
              <div className="month-block-header">
                <strong>{month.label}</strong>
              </div>
              <div className="month-block-weekdays">
                {weekdayLabels.map((dayLabel) => (
                  <span key={`${month.key}-${dayLabel}`}>{dayLabel.slice(0, 1)}</span>
                ))}
              </div>
              <div className="month-block-body">
                {month.weeks.flat().map((cell) => renderHeatmapCell(cell))}
              </div>
            </section>
          ))}
        </div>
      </Tooltip.Provider>

      <div className="heatmap-legend">
        <span className="metric-detail">Lower load</span>
        <div className="heatmap-legend-scale">
          <span className="heatmap-cell tone-0 legend" />
          <span className="heatmap-cell tone-1 legend" />
          <span className="heatmap-cell tone-2 legend" />
          <span className="heatmap-cell tone-3 legend" />
        </div>
        <span className="metric-detail">Higher load</span>
      </div>
    </section>
  );
}
