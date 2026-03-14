import Link from "next/link";

import { SiteHeader } from "../components/site-header";
import { formatOverviewDate, formatSyncTime } from "../lib/format";
import { getOverviewData } from "../services/overview";

export default async function HomePage() {
  const overview = await getOverviewData();
  const leadAnomaly = overview.anomalies[0] ?? null;

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
        </div>
        <div className="hero-orb" aria-hidden="true" />
      </section>

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
          <strong className="status-title">
            {overview.connection.connected ? "Oura connected" : "Oura not connected"}
          </strong>
          <span className="metric-detail">
            {overview.connection.configured
              ? "OAuth is configured locally."
              : "Add local Oura credentials to enable live sync."}
          </span>
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
