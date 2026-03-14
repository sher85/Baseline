import { SiteHeader } from "../../components/site-header";
import { TrendChart } from "../../components/trend-chart";
import {
  formatDuration,
  formatNumber,
  formatOverviewDate,
  formatShortDate,
  formatTemperature
} from "../../lib/format";
import { getTrendData } from "../../services/analytics";

export default async function TrendsPage() {
  const [sevenDay, thirtyDay] = await Promise.all([
    getTrendData("7d"),
    getTrendData("30d")
  ]);

  const sevenDayRecovery = sevenDay.series.map((point) => ({
    label: formatShortDate(point.day),
    value: point.recoveryScore
  }));
  const sevenDaySleep = sevenDay.series.map((point) => ({
    label: formatShortDate(point.day),
    value:
      point.sleepSeconds === null
        ? null
        : Number((point.sleepSeconds / 3600).toFixed(2))
  }));
  const thirtyDayHrv = thirtyDay.series.map((point) => ({
    label: formatShortDate(point.day),
    value: point.hrv
  }));
  const thirtyDayTemperature = thirtyDay.series.map((point) => ({
    label: formatShortDate(point.day),
    value: point.temperatureDeviation
  }));

  return (
    <main className="page-shell">
      <SiteHeader currentPath="/trends" />

      <section className="page-intro">
        <div>
          <p className="eyebrow">Trends</p>
          <h1>Short arc, long arc, same deterministic foundation.</h1>
        </div>
        <p className="hero-text">
          {sevenDay.series.length
            ? `Latest trend day: ${formatOverviewDate(sevenDay.range.endDay)}. Use the 7-day view for short-term recovery drift and the 30-day view for slower physiological changes.`
            : "Trend data will appear here once the local API has enough synced history."}
        </p>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">7-Day Recovery Avg</span>
          <strong className="metric-value">
            {sevenDay.summary.averageRecoveryScore !== null
              ? formatNumber(sevenDay.summary.averageRecoveryScore)
              : "--"}
          </strong>
          <span className="metric-detail">A compact read on recent recovery quality.</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">7-Day Sleep Avg</span>
          <strong className="metric-value">
            {formatDuration(sevenDay.summary.averageSleepSeconds)}
          </strong>
          <span className="metric-detail">Average nightly sleep over the last week.</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">30-Day HRV Avg</span>
          <strong className="metric-value">
            {thirtyDay.summary.averageHrv !== null
              ? `${formatNumber(thirtyDay.summary.averageHrv)} ms`
              : "--"}
          </strong>
          <span className="metric-detail">Longer-range autonomic pattern.</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Flagged Days</span>
          <strong className="metric-value">{thirtyDay.summary.daysWithAnomalies}</strong>
          <span className="metric-detail">Days with at least one deterministic anomaly.</span>
        </article>
      </section>

      <section className="trend-grid">
        <article className="chart-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">7-Day</p>
              <h2>Recovery score</h2>
            </div>
            <span className="chart-caption">
              {sevenDay.series.length
                ? `${formatShortDate(sevenDay.range.startDay)} to ${formatShortDate(sevenDay.range.endDay)}`
                : "Waiting for data"}
            </span>
          </div>
          <TrendChart
            data={sevenDayRecovery}
            dataKey="value"
            label="Recovery Score"
            decimals={0}
            suffix="/100"
          />
        </article>

        <article className="chart-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">7-Day</p>
              <h2>Sleep duration</h2>
            </div>
            <span className="chart-caption">Hours per night</span>
          </div>
          <TrendChart
            data={sevenDaySleep}
            dataKey="value"
            label="Sleep Duration"
            decimals={1}
            suffix=" h"
          />
        </article>

        <article className="chart-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">30-Day</p>
              <h2>HRV trend</h2>
            </div>
            <span className="chart-caption">Personal variability over time</span>
          </div>
          <TrendChart
            data={thirtyDayHrv}
            dataKey="value"
            label="HRV"
            decimals={0}
            suffix=" ms"
          />
        </article>

        <article className="chart-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">30-Day</p>
              <h2>Temperature deviation</h2>
            </div>
            <span className="chart-caption">
              Latest {thirtyDay.series.length ? formatTemperature(thirtyDay.series.at(-1)?.temperatureDeviation ?? null) : "--"}
            </span>
          </div>
          <TrendChart
            data={thirtyDayTemperature}
            dataKey="value"
            label="Temperature Deviation"
            decimals={2}
            suffix=" degC"
          />
        </article>
      </section>
    </main>
  );
}
