import { PageEmptyState } from "../../components/page-empty-state";
import { SiteHeader } from "../../components/site-header";
import { formatOverviewDate, formatShortDate } from "../../lib/format";
import { getRecentAnomalyData, getTrendData } from "../../services/analytics";

function severityLabel(severity: "low" | "medium" | "high") {
  return severity === "high"
    ? "High"
    : severity === "medium"
      ? "Medium"
      : "Low";
}

export default async function AnomaliesPage() {
  const [recentAnomalies, recentTrends] = await Promise.all([
    getRecentAnomalyData(24),
    getTrendData("30d")
  ]);
  const latestAnomaly = recentAnomalies.items[0] ?? null;
  const hasRecentHistory = recentAnomalies.items.length > 0 || recentTrends.series.length > 0;

  if (!hasRecentHistory) {
    return (
      <main className="page-shell">
        <SiteHeader currentPath="/anomalies" />
        <section className="page-intro">
          <div>
            <p className="eyebrow">Anomalies</p>
            <h1>Flagged days, explained without drama.</h1>
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

      <section className="page-intro">
        <div>
          <p className="eyebrow">Anomalies</p>
          <h1>Flagged days, explained without drama.</h1>
        </div>
        <p className="hero-text">
          {latestAnomaly
            ? `Most recent flag: ${latestAnomaly.title} on ${formatOverviewDate(latestAnomaly.day)}. These are threshold-based signals against your own rolling baseline, not black-box alerts.`
            : "Recent anomaly history will appear here once the local analytics engine has flagged a day."}
        </p>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">Recent Flags</span>
          <strong className="metric-value">{recentAnomalies.items.length}</strong>
          <span className="metric-detail">Stored from the latest review window.</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Flagged Days</span>
          <strong className="metric-value">{recentTrends.summary.daysWithAnomalies}</strong>
          <span className="metric-detail">Unique days with at least one anomaly in 30 days.</span>
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

      <section className="list-panel">
        <div className="card-header">
          <div>
            <p className="eyebrow">Recent Anomaly History</p>
            <h2>Deterministic flags</h2>
          </div>
        </div>

        <div className="anomaly-list">
          {recentAnomalies.items.length ? (
            recentAnomalies.items.map((anomaly, index) => (
              <article key={`${anomaly.day}-${anomaly.type}-${index}`} className="anomaly-card">
                <div className="anomaly-copy">
                  <div className="anomaly-meta">
                    <span className={`data-badge severity-${anomaly.severity}`}>
                      {severityLabel(anomaly.severity)}
                    </span>
                    <span className="metric-detail">{formatOverviewDate(anomaly.day)}</span>
                  </div>
                  <strong className="anomaly-title">{anomaly.title}</strong>
                  <p>{anomaly.description}</p>
                </div>
                <span className="anomaly-type">{anomaly.type.replaceAll("_", " ")}</span>
              </article>
            ))
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
