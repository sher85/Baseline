import { PageEmptyState } from "../../components/page-empty-state";
import { SiteHeader } from "../../components/site-header";
import { TrendChart } from "../../components/trend-chart";
import {
  formatDuration,
  formatNumber,
  formatOverviewDate,
  formatShortDate,
  formatTemperature
} from "../../lib/format";
import { getRecoveryDetailData, getTrendData } from "../../services/analytics";

function formatFactorValue(value: number | null, unit: string) {
  if (value === null) {
    return "--";
  }

  if (unit === "seconds") {
    return formatDuration(value);
  }

  if (unit === "degC") {
    return formatTemperature(value);
  }

  return `${formatNumber(value, unit === "ms" ? 0 : 1)} ${unit}`;
}

function formatContribution(value: number | null) {
  if (value === null) {
    return "Neutral";
  }

  if (value > 0.1) {
    return "Helping";
  }

  if (value < -0.1) {
    return "Dragging";
  }

  return "Neutral";
}

export default async function RecoveryPage() {
  const [recovery, trends] = await Promise.all([
    getRecoveryDetailData(),
    getTrendData("30d")
  ]);
  const hasTrendData = trends.series.some((point) => point.recoveryScore !== null);

  const chartData = trends.series.map((point) => ({
    label: formatShortDate(point.day),
    score: point.recoveryScore
  }));

  if (!recovery && !hasTrendData) {
    return (
      <main className="page-shell">
        <SiteHeader currentPath="/recovery" />
        <section className="page-intro">
          <div>
            <p className="eyebrow">Recovery</p>
            <h1>Understand what moved today&apos;s recovery score.</h1>
          </div>
          <p className="hero-text">
            This surface becomes meaningful only after the local analytics engine has computed recovery signals.
          </p>
        </section>
        <PageEmptyState
          eyebrow="Recovery Data"
          title="No recovery analytics are available yet."
          description="Run a sync and let the API compute baselines, factor contributions, and anomaly rules. Once that pipeline has data, this page will show the full recovery explanation."
          primaryHref="/"
          primaryLabel="Back to overview"
        />
      </main>
    );
  }

  return (
    <main className="page-shell">
      <SiteHeader currentPath="/recovery" />

      <section className="page-intro">
        <div>
          <p className="eyebrow">Recovery</p>
          <h1>Understand what moved today&apos;s recovery score.</h1>
        </div>
        <p className="hero-text">
          {recovery
            ? `${formatOverviewDate(recovery.day)} scored ${recovery.score}/100. ${recovery.explanationSummary}`
            : "Recovery detail will appear here once your local API has computed baseline-aware scores."}
        </p>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">Recovery Score</span>
          <strong className="metric-value">{recovery?.score ?? "--"}</strong>
          <span className="metric-detail">
            Confidence{" "}
            {recovery?.confidence !== null && recovery?.confidence !== undefined
              ? `${Math.round(recovery.confidence * 100)}%`
              : "--"}
          </span>
        </article>
        <article className="metric-card">
          <span className="metric-label">HRV</span>
          <strong className="metric-value">
            {recovery?.vitals.hrv !== null && recovery?.vitals.hrv !== undefined
              ? `${formatNumber(recovery.vitals.hrv)} ms`
              : "--"}
          </strong>
          <span className="metric-detail">Current nightly variability signal.</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Resting HR</span>
          <strong className="metric-value">
            {recovery?.vitals.restingHeartRate !== null &&
            recovery?.vitals.restingHeartRate !== undefined
              ? `${formatNumber(recovery.vitals.restingHeartRate)} bpm`
              : "--"}
          </strong>
          <span className="metric-detail">Lower than baseline is treated as favorable.</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Temperature</span>
          <strong className="metric-value">
            {recovery ? formatTemperature(recovery.vitals.temperatureDeviation) : "--"}
          </strong>
          <span className="metric-detail">Deviation is compared against your rolling median.</span>
        </article>
      </section>

      <section className="section-grid">
        <article className="chart-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">30-Day Trend</p>
              <h2>Recovery arc</h2>
            </div>
            <span className="chart-caption">
              {trends.summary.daysWithAnomalies} flagged day
              {trends.summary.daysWithAnomalies === 1 ? "" : "s"}
            </span>
          </div>
          <TrendChart
            data={chartData}
            dataKey="score"
            decimals={0}
            label="Recovery Score"
            suffix="/100"
          />
        </article>

        <article className="detail-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Factor Breakdown</p>
              <h2>What moved the score</h2>
            </div>
          </div>
          <div className="factor-list">
            {(recovery?.factors ?? []).map((factor) => (
              <article key={factor.key} className="factor-row">
                <div>
                  <strong>{factor.label}</strong>
                  <p>{factor.detail}</p>
                </div>
                <div className="factor-values">
                  <span className={`data-badge ${factor.status}`}>
                    {formatContribution(factor.contribution)}
                  </span>
                  <span>{formatFactorValue(factor.currentValue, factor.unit)}</span>
                  <span className="metric-detail">
                    Baseline {formatFactorValue(factor.baselineValue, factor.unit)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="status-grid">
        <article className="status-card">
          <p className="eyebrow">Latest Explanation</p>
          <strong className="status-title">Deterministic, not magical</strong>
          <span className="metric-detail">
            {recovery?.explanationSummary ??
              "Once the API is available, this card will summarize the latest recovery state."}
          </span>
        </article>
        <article className="status-card">
          <p className="eyebrow">Anomalies</p>
          <strong className="status-title">
            {recovery?.anomalies.length ? `${recovery.anomalies.length} flag(s)` : "No active flags"}
          </strong>
          <span className="metric-detail">
            {recovery?.anomalies[0]?.description ??
              "No deterministic anomaly rule fired for the latest day."}
          </span>
        </article>
      </section>
    </main>
  );
}
