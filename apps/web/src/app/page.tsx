import Link from "next/link";

import { HelpTooltip } from "../components/help-tooltip";
import { OuraConnectButton } from "../components/oura-connect-button";
import { PageEmptyState } from "../components/page-empty-state";
import { SiteHeader } from "../components/site-header";
import { formatOverviewDate, formatSyncTime } from "../lib/format";
import { getOverviewData } from "../services/overview";

type HomePageProps = {
  searchParams?: Promise<{
    oura?: string;
    reason?: string;
  }>;
};

function getOuraNotice(ouraStatus?: string, reason?: string) {
  switch (ouraStatus) {
    case "connected":
      return {
        tone: "positive" as const,
        title: "Oura connected",
        detail: "Your Oura authorization was saved locally. Fresh syncs can resume with the saved connection."
      };
    case "access_denied":
      return {
        tone: "warning" as const,
        title: "Oura connection canceled",
        detail: "The authorization request was canceled before Oura granted access."
      };
    case "invalid_callback":
      return {
        tone: "warning" as const,
        title: "Invalid callback received",
        detail: "The Oura callback was missing required parameters. Start the connection flow again."
      };
    case "invalid_state":
      return {
        tone: "warning" as const,
        title: "Expired connection link",
        detail:
          "The Oura callback came back with an expired or unknown state. Start a fresh connect flow from this page and complete it within 10 minutes."
      };
    case "token_exchange_failed":
      return {
        tone: "warning" as const,
        title: "Oura token exchange failed",
        detail: reason
          ? `Oura rejected the callback during token exchange: ${reason}`
          : "Oura rejected the callback during token exchange. Confirm the client credentials and redirect URI match the Oura app exactly."
      };
    default:
      return null;
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const overview = await getOverviewData();
  const leadAnomaly = overview.anomalies[0] ?? null;
  const isFallback = overview.source === "fallback";
  const isEmpty = overview.source === "empty";
  const isStoredSnapshot = !isFallback && !isEmpty && !overview.connection.connected;
  const ouraNotice = getOuraNotice(
    resolvedSearchParams?.oura,
    resolvedSearchParams?.reason
  );
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
    : isStoredSnapshot
      ? `Showing the latest stored Oura data from ${formatOverviewDate(overview.day)}. Reconnect locally to resume fresh syncs.`
    : overview.connection.configured
      ? "OAuth is configured locally."
      : "Add local Oura credentials to enable live sync.";

  return (
    <main className="page-shell">
      <SiteHeader currentPath="/" />

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Overview</p>
          <h1>Your latest recovery state, in one clear view.</h1>
          <p className="hero-text">
            For <span className="hero-date">{formatOverviewDate(overview.day)}</span>,
            Baseline brings sleep, recovery, anomalies, and sync state into one readable snapshot.
          </p>
          <div className="hero-meta">
            <span
              className={`status-pill ${
                isFallback || isEmpty || isStoredSnapshot ? "warning" : "positive"
              }`}
            >
              {isFallback
                ? "API offline"
                : isEmpty
                  ? "Waiting for data"
                  : isStoredSnapshot
                    ? "Stored snapshot"
                    : "Live analytics"}
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
          {ouraNotice ? (
            <div className={`integration-banner ${ouraNotice.tone}`}>
              <strong>{ouraNotice.title}</strong>
              <p>{ouraNotice.detail}</p>
            </div>
          ) : null}
          {!isFallback && !overview.connection.connected ? (
            <div className="hero-actions">
              <OuraConnectButton
                disabled={!overview.connection.configured}
                mode={overview.connection.needsReconnect ? "reconnect" : "connect"}
              />
              <p className="hero-action-note">
                {overview.connection.configured
                  ? "This opens the Oura OAuth screen in your browser and returns here after approval."
                  : "Add local Oura credentials first so the app can start the OAuth flow."}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {isFallback || isEmpty ? (
        <PageEmptyState
          eyebrow={isFallback ? "API Status" : "Data Status"}
          title={
            isFallback
              ? "The dashboard is in local fallback mode."
              : "The API is up, but the dashboard has no data yet."
          }
          description={
            isFallback
              ? "The web app is running, but the live API data is not available yet. Start the backend or reconnect Oura to replace these placeholders with real analytics."
              : "The API is responding, but this database is still empty. Run the demo seed or sync Oura locally to populate the dashboard with real analytics."
          }
          primaryHref="/sleep"
          primaryLabel="View product surfaces"
        />
      ) : null}

      <section className="metric-grid">
        {overview.metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            {metric.label === "Recovery" ? (
              <div className="metric-label-row">
                <span className="metric-label">{metric.label}</span>
                <HelpTooltip content={metric.detail} />
              </div>
            ) : (
              <span className="metric-label">{metric.label}</span>
            )}
            <strong className="metric-value">{metric.value}</strong>
            {metric.label === "Recovery" ? null : (
              <span className="metric-detail">{metric.detail}</span>
            )}
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
            {overview.sync.running
              ? "Sync in progress"
              : isStoredSnapshot
                ? "Waiting for reconnect"
                : overview.sync.latestStatus}
          </strong>
          <span className="metric-detail">
            {isStoredSnapshot
              ? `Latest stored data day: ${formatOverviewDate(overview.day)}`
              : `Last completed sync: ${formatSyncTime(overview.sync.lastSyncedAt)}`}
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
