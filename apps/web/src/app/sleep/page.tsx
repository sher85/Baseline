import { PageEmptyState } from "../../components/page-empty-state";
import { SiteHeader } from "../../components/site-header";
import { TrendChart } from "../../components/trend-chart";
import {
  formatDuration,
  formatNumber,
  formatOverviewDate,
  formatPercent,
  formatShortDate,
  formatSignedMinutes
} from "../../lib/format";
import { getSleepData, getTrendData } from "../../services/analytics";

function formatClockTime(isoDate: string | null) {
  if (!isoDate) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(isoDate));
}

export default async function SleepPage() {
  const [sleep, trends] = await Promise.all([getSleepData(), getTrendData("7d")]);
  const chartData = trends.series.map((point) => ({
    label: formatShortDate(point.day),
    sleepHours:
      point.sleepSeconds === null
        ? null
        : Number((point.sleepSeconds / 3600).toFixed(2))
  }));
  const hasTrendData = trends.series.some((point) => point.sleepSeconds !== null);

  if (!sleep && !hasTrendData) {
    return (
      <main className="page-shell">
        <SiteHeader currentPath="/sleep" />
        <section className="page-intro">
          <div>
            <p className="eyebrow">Sleep</p>
            <h1>Nightly sleep, with context instead of guesswork.</h1>
          </div>
          <p className="hero-text">
            This surface needs synced sleep data before it can explain nightly patterns.
          </p>
        </section>
        <PageEmptyState
          eyebrow="Sleep Data"
          title="No sleep data is available yet."
          description="Connect Oura and run a sync, or start the local API if it is offline. Once sleep data lands, this page will render trend charts, nightly timing, and baseline-aware context."
          primaryHref="/"
          primaryLabel="Back to overview"
        />
      </main>
    );
  }

  return (
    <main className="page-shell">
      <SiteHeader currentPath="/sleep" />

      <section className="page-intro">
        <div>
          <p className="eyebrow">Sleep</p>
          <h1>Nightly sleep, with context instead of guesswork.</h1>
        </div>
        <p className="hero-text">
          {sleep
            ? `Latest night: ${formatOverviewDate(sleep.day)}. ${sleep.note}`
            : "Sleep data will appear here once the local API has synced at least one night."}
        </p>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">Total Sleep</span>
          <strong className="metric-value">
            {sleep ? formatDuration(sleep.totals.sleepSeconds) : "--"}
          </strong>
          <span className="metric-detail">
            {sleep ? formatSignedMinutes(sleep.baseline.durationDeltaSeconds) : "API unavailable"}
            {sleep && sleep.baseline.sleepDurationSeconds !== null ? " vs. baseline" : ""}
          </span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Time In Bed</span>
          <strong className="metric-value">
            {sleep ? formatDuration(sleep.totals.timeInBedSeconds) : "--"}
          </strong>
          <span className="metric-detail">Context for whether efficiency held up.</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Efficiency</span>
          <strong className="metric-value">
            {sleep ? formatPercent(sleep.totals.efficiency) : "--"}
          </strong>
          <span className="metric-detail">A quick read on sleep continuity.</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Avg HRV During Sleep</span>
          <strong className="metric-value">
            {sleep ? `${formatNumber(sleep.vitals.averageHrv)} ms` : "--"}
          </strong>
          <span className="metric-detail">Useful as a nightly autonomic signal.</span>
        </article>
      </section>

      <section className="section-grid">
        <article className="chart-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">7-Day Trend</p>
              <h2>Sleep duration</h2>
            </div>
            <span className="chart-caption">
              {trends.series.length
                ? `${formatShortDate(trends.range.startDay)} to ${formatShortDate(trends.range.endDay)}`
                : "Waiting for trend data"}
            </span>
          </div>
          <TrendChart
            data={chartData}
            dataKey="sleepHours"
            decimals={1}
            label="Sleep Duration"
            suffix=" h"
          />
        </article>

        <article className="detail-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Sleep Timing</p>
              <h2>Latest night details</h2>
            </div>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Bedtime start</dt>
              <dd>{formatClockTime(sleep?.timing.bedtimeStart ?? null)}</dd>
            </div>
            <div>
              <dt>Wake time</dt>
              <dd>{formatClockTime(sleep?.timing.bedtimeEnd ?? null)}</dd>
            </div>
            <div>
              <dt>Latency</dt>
              <dd>{sleep ? formatDuration(sleep.totals.latencySeconds) : "--"}</dd>
            </div>
            <div>
              <dt>Lowest HR</dt>
              <dd>{sleep ? `${formatNumber(sleep.vitals.lowestHr)} bpm` : "--"}</dd>
            </div>
            <div>
              <dt>Average HR</dt>
              <dd>{sleep ? `${formatNumber(sleep.vitals.averageHr)} bpm` : "--"}</dd>
            </div>
            <div>
              <dt>7-day average sleep</dt>
              <dd>{formatDuration(trends.summary.averageSleepSeconds)}</dd>
            </div>
          </dl>
        </article>
      </section>
    </main>
  );
}
