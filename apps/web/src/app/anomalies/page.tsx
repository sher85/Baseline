import Link from "next/link";

import { AnomalyHeatmap } from "../../components/anomaly-heatmap";
import { HelpTooltip } from "../../components/help-tooltip";
import { PageEmptyState } from "../../components/page-empty-state";
import { SiteHeader } from "../../components/site-header";
import { formatOverviewDate, formatShortDate } from "../../lib/format";
import {
  getAnomalyHeatmapData,
  getAnomalyHistoryData,
  getRecentAnomalyData,
  getTrendData
} from "../../services/analytics";

function severityLabel(severity: "low" | "medium" | "high") {
  return severity === "high"
    ? "High"
    : severity === "medium"
      ? "Medium"
      : "Low";
}

function renderSeverityCountBadges(severityCounts: { high: number; medium: number; low: number }) {
  const orderedSeverities: Array<"high" | "medium" | "low"> = ["high", "medium", "low"];

  return orderedSeverities
    .filter((severity) => severityCounts[severity] > 0)
    .map((severity) => (
      <span key={severity} className={`data-badge severity-${severity} severity-count-badge`}>
        {severityCounts[severity]} {severityLabel(severity)}
      </span>
    ));
}

function renderAnomalyGroup(group: {
  anomalies: Array<{
    description: string;
    severity: "low" | "medium" | "high";
    title: string;
    type: string;
  }>;
  day: string;
  highestSeverity: "low" | "medium" | "high";
  severityCounts: {
    high: number;
    low: number;
    medium: number;
  };
}, options?: { focused?: boolean; muted?: boolean }) {
  return (
    <article
      id={`anomaly-day-${group.day}`}
      key={group.day}
      className={[
        "anomaly-day-card",
        options?.muted ? "muted" : "",
        options?.focused ? "focused" : ""
      ].filter(Boolean).join(" ")}
    >
      <div className="anomaly-day-header">
        <div>
          <h3>{formatOverviewDate(group.day)}</h3>
        </div>
      </div>

      <div className="anomaly-list">
        {group.anomalies.map((anomaly, index) => (
          <details key={`${group.day}-${anomaly.type}-${index}`} className="anomaly-card">
            <summary className="anomaly-summary">
              <div className="anomaly-summary-main">
                <div className="anomaly-headline">
                  <strong className="anomaly-title">{anomaly.title}</strong>
                  <span className={`data-badge severity-${anomaly.severity}`}>
                    {severityLabel(anomaly.severity)}
                  </span>
                </div>
              </div>
              <div className="anomaly-summary-actions">
                <span className="anomaly-toggle">
                  Details
                  <span className="anomaly-toggle-chevron" aria-hidden="true" />
                </span>
              </div>
            </summary>
            <div className="anomaly-detail">
              <p>{anomaly.description}</p>
            </div>
          </details>
        ))}
      </div>
    </article>
  );
}

type AnomaliesPageProps = {
  searchParams?: Promise<{
    focusDay?: string;
    historyDays?: string;
    range?: string;
    type?: string;
  }>;
};

function buildAnomaliesHref(options: {
  focusDay?: string;
  historyDays?: number;
  range?: "3m" | "6m" | "12m";
  type?: "all" | "sleep" | "hrv" | "resting_hr" | "temperature";
}) {
  const params = new URLSearchParams();

  if (options.range) {
    params.set("range", options.range);
  }

  if (options.type) {
    params.set("type", options.type);
  }

  if (options.historyDays) {
    params.set("historyDays", String(options.historyDays));
  }

  if (options.focusDay) {
    params.set("focusDay", options.focusDay);
  }

  const query = params.toString();

  return query ? `/anomalies?${query}` : "/anomalies";
}

export default async function AnomaliesPage({ searchParams }: AnomaliesPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const focusDay =
    typeof resolvedSearchParams.focusDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(resolvedSearchParams.focusDay)
      ? resolvedSearchParams.focusDay
      : undefined;
  const requestedHistoryDays = Number(resolvedSearchParams.historyDays ?? 7);
  const historyDays = Number.isFinite(requestedHistoryDays)
    ? Math.min(Math.max(Math.trunc(requestedHistoryDays), 7), 366)
    : 7;
  const range =
    resolvedSearchParams.range === "3m" || resolvedSearchParams.range === "6m" || resolvedSearchParams.range === "12m"
      ? resolvedSearchParams.range
      : "3m";
  const type =
    resolvedSearchParams.type === "sleep" ||
    resolvedSearchParams.type === "hrv" ||
    resolvedSearchParams.type === "resting_hr" ||
    resolvedSearchParams.type === "temperature" ||
    resolvedSearchParams.type === "all"
      ? resolvedSearchParams.type
      : "all";

  const [recentAnomalies, recentTrends, history, heatmap] = await Promise.all([
    getRecentAnomalyData(24),
    getTrendData("30d"),
    getAnomalyHistoryData(historyDays, focusDay ? { targetDay: focusDay } : undefined),
    getAnomalyHeatmapData(range, type)
  ]);
  const latestAnomaly = recentAnomalies.items[0] ?? null;
  const featuredDays = history.items.slice(0, 7);
  const olderDays = history.items.slice(7);
  const hasRecentHistory = recentAnomalies.items.length > 0 || recentTrends.series.length > 0;

  if (!hasRecentHistory) {
    return (
      <main className="page-shell">
        <SiteHeader currentPath="/anomalies" />
        <section className="page-intro">
          <div>
            <p className="eyebrow">Anomalies</p>
            <h1 className="anomalies-hero-title">Review flagged days over time.</h1>
          </div>
          <p className="hero-text">
            Anomaly history appears here once the analytics engine has enough recent days to evaluate.
          </p>
        </section>
        <PageEmptyState
          eyebrow="Anomaly History"
          title="No anomaly history is available yet."
          description="This can mean either the API is offline or the project does not yet have enough synced recovery history to evaluate the anomaly rules over time."
          primaryHref="/"
          primaryLabel="Back to overview"
          secondaryHref="/recovery"
          secondaryLabel="Open recovery page"
        />
      </main>
    );
  }

  return (
    <main className="page-shell">
      <SiteHeader currentPath="/anomalies" />

      <section className="page-intro anomalies-intro">
        <div>
          <p className="eyebrow">Anomalies</p>
          <h1 className="anomalies-hero-title">Review flagged days over time.</h1>
        </div>
        <p className="hero-text">
          {latestAnomaly
            ? `Most recent flag: ${latestAnomaly.title} on ${formatOverviewDate(latestAnomaly.day)}. These are threshold-based signals against your own rolling baseline, organized so you can spot rough patches and inspect the exact day.`
            : "Recent anomaly history will appear here once the local analytics engine has flagged a day."}
        </p>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <div className="metric-label-row">
            <span className="metric-label">Flags (30d)</span>
            <HelpTooltip content="Total anomaly records in the latest 30-day review window." />
          </div>
          <strong className="metric-value">{recentAnomalies.items.length}</strong>
          <span className="metric-detail">Threshold-based flags in the current 30-day review window.</span>
        </article>
        <article className="metric-card">
          <div className="metric-label-row">
            <span className="metric-label">Days Flagged (30d)</span>
            <HelpTooltip content="Unique days with at least one anomaly flag in the latest 30-day review window." />
          </div>
          <strong className="metric-value">{recentTrends.summary.daysWithAnomalies}</strong>
          <span className="metric-detail">Unique recent days with at least one stored anomaly.</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Latest Severity</span>
          <strong className="metric-value">
            {latestAnomaly ? severityLabel(latestAnomaly.severity) : "--"}
          </strong>
          <span className="metric-detail">A quick read on the most recent flagged condition.</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Latest Day</span>
          <strong className="metric-value">
            {latestAnomaly ? formatShortDate(latestAnomaly.day) : "--"}
          </strong>
          <span className="metric-detail">Most recent anomaly date in the list below.</span>
        </article>
      </section>

      <AnomalyHeatmap
        categories={heatmap.categories}
        days={heatmap.days}
        filter={heatmap.filter}
        focusDay={focusDay}
        historyDays={historyDays}
        range={heatmap.range}
      />

      <section className="list-panel">
        <div className="card-header">
          <div>
            <p className="eyebrow">Recent Anomaly History</p>
          </div>
        </div>

        <div className="anomaly-list">
          {featuredDays.length ? (
            <>
              {featuredDays.map((group) => (
                renderAnomalyGroup(group, { focused: group.day === focusDay })
              ))}

              {olderDays.length ? (
                <section className="anomaly-history-older">
                  <div className="anomaly-history-toolbar">
                    <Link href={buildAnomaliesHref({ range, type, historyDays: 7 })} className="history-link">
                      Back to latest
                    </Link>
                    <div>
                      <p className="eyebrow">Older History</p>
                      <h3>Previous flagged days</h3>
                    </div>
                  </div>

                  <div className="anomaly-history-stack">
                    {olderDays.map((group) =>
                      renderAnomalyGroup(group, {
                        focused: group.day === focusDay,
                        muted: true
                      })
                    )}
                  </div>
                </section>
              ) : null}

              {history.hasMore ? (
                <Link
                  href={buildAnomaliesHref({
                    range,
                    type,
                    historyDays: historyDays + 10
                  })}
                  className="history-link"
                >
                  Load older history
                </Link>
              ) : null}
            </>
          ) : (
            <article className="anomaly-card empty">
              <div className="anomaly-copy">
                <strong className="anomaly-title">No recent anomaly flags</strong>
                <p>The current data window has not triggered any of the deterministic anomaly rules.</p>
              </div>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
