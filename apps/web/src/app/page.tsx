import Link from "next/link";

import { PageEmptyState } from "../components/page-empty-state";
import { SiteHeader } from "../components/site-header";
import { formatOverviewDate, formatSyncTime } from "../lib/format";
import { getOverviewData } from "../services/overview";

export default async function HomePage() {
  const overview = await getOverviewData();
  const leadAnomaly = overview.anomalies[0] ?? null;
  const isFallback = overview.source === "fallback";
  const connectionLabel = overview.connection.needsReconnect
    ? "Reconnect Oura"
    : overview.connection.connected
      ? "Oura connected"
      : "Oura disconnected";
  const connectionTone = overview.connection.needsReconnect
    ? "warning"
    : overview.connection.connected
      ? "positive"
      : "neutral";
  const connectionDetail = overview.connection.needsReconnect
    ? "The stored Oura authorization is no longer valid. Reconnect locally to resume sync."
    : overview.connection.configured
      ? "OAuth is configured locally."
      : "Add local Oura credentials to enable live sync.";

  return (
    <main className="page-shell">
      <SiteHeader currentPath="/" />

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Wearable Analytics MVP</p>
          <h1>Luxury calm, scientific backbone.</h1>
          <p className="hero-text">
            Live recovery intelligence for{" "}
            <span className="hero-date">{formatOverviewDate(overview.day)}</span>,
            built to feel premium while staying explicit, interpretable, and
            engineer-grade.
          </p>
          <div className="hero-meta">
            <span className={`status-pill ${isFallback ? "warning" : "positive"}`}>
              {isFallback ? "Preview mode" : "Live analytics"}
            </span>
            <span
              className={`status-pill ${connectionTone}`}
            >
              {connectionLabel}
            </span>
            <span className="status-pill neutral">
              Sync {overview.sync.running ? "running" : overview.sync.latestStatus}
            </span>
          </div>
        </div>
        <div className="hero-orb" aria-hidden="true" />
      </section>

      {isFallback ? (
        <PageEmptyState
          eyebrow="API Status"
          title="The dashboard is in local fallback mode."
          description="The web app is running, but the live API data is not available yet. Start the backend or reconnect Oura to replace these placeholders with real analytics."
          primaryHref="/sleep"
          primaryLabel="View product surfaces"
        />
      ) : null}

      <section className="metric-grid">
        {overview.metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <span className="metric-label">{metric.label}</span>
            <strong className="metric-value">{metric.value}</strong>
            <span className="metric-detail">{metric.detail}</span>
          </article>
        ))}
      </section>

      <section className="insight-panel">
        <div>
          <p className="eyebrow">Latest Interpretation</p>
          <h2>{leadAnomaly ? leadAnomaly.title : "Today looks stable."}</h2>
        </div>
        <div className="insight-list">
          {overview.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      </section>

      <section className="status-grid">
        <article className="status-card">
          <p className="eyebrow">Sync Status</p>
          <strong className="status-title">
            {overview.sync.running ? "Sync in progress" : overview.sync.latestStatus}
          </strong>
          <span className="metric-detail">
            Last completed sync: {formatSyncTime(overview.sync.lastSyncedAt)}
          </span>
        </article>
        <article className="status-card">
          <p className="eyebrow">Connection</p>
          <strong className="status-title">{connectionLabel}</strong>
          <span className="metric-detail">{connectionDetail}</span>
        </article>
      </section>

      <section className="link-grid">
        <Link href="/sleep" className="link-card">
          <p className="eyebrow">Sleep Surface</p>
          <strong className="status-title">Inspect your nightly pattern</strong>
          <span className="metric-detail">
            Duration, efficiency, bedtime timing, and live 7-day trend context.
          </span>
        </Link>
        <Link href="/recovery" className="link-card">
          <p className="eyebrow">Recovery Surface</p>
          <strong className="status-title">See what moved the score</strong>
          <span className="metric-detail">
            Factor breakdowns, anomaly flags, and the 30-day recovery arc.
          </span>
        </Link>
        <Link href="/trends" className="link-card">
          <p className="eyebrow">Trend Surface</p>
          <strong className="status-title">Read the longer arc</strong>
          <span className="metric-detail">
            Compare 7-day and 30-day shifts in sleep, recovery, HRV, temperature, and activity.
          </span>
        </Link>
        <Link href="/anomalies" className="link-card">
          <p className="eyebrow">Anomaly Surface</p>
          <strong className="status-title">Review the flagged days</strong>
          <span className="metric-detail">
            Recent anomaly history with severity, dates, and deterministic explanations.
          </span>
        </Link>
      </section>
    </main>
  );
}
