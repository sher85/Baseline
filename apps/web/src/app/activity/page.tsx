import { PageEmptyState } from "../../components/page-empty-state";
import { SiteHeader } from "../../components/site-header";
import { TrendChart } from "../../components/trend-chart";
import {
  formatDistanceMeters,
  formatDuration,
  formatNumber,
  formatOverviewDate,
  formatShortDate
} from "../../lib/format";
import { getActivityData } from "../../services/analytics";

function formatWorkoutIntensity(value: string | null) {
  if (!value) {
    return "Recorded";
  }

  return value.replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatWorkoutSource(value: string | null) {
  if (!value) {
    return "Apple Health";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export default async function ActivityPage() {
  const activity = await getActivityData();

  if (!activity) {
    return (
      <main className="page-shell">
        <SiteHeader currentPath="/activity" />
        <section className="page-intro">
          <div>
            <p className="eyebrow">Activity</p>
            <h1>See how often you actually get out and train.</h1>
          </div>
          <p className="hero-text">
            This page comes alive once the local API has synced movement totals or workout sessions.
          </p>
        </section>
        <PageEmptyState
          eyebrow="Activity Data"
          title="No activity summary is available yet."
          description="Point the iPhone bridge at this Baseline instance and run a sync so workouts, steps, and active calories start landing here."
          primaryHref="/"
          primaryLabel="Back to overview"
        />
      </main>
    );
  }

  const hasData = activity.totals.hasDailyActivityData || activity.totals.hasWorkoutData;

  if (!hasData) {
    return (
      <main className="page-shell">
        <SiteHeader currentPath="/activity" />
        <section className="page-intro">
          <div>
            <p className="eyebrow">Activity</p>
            <h1>See how often you actually get out and train.</h1>
          </div>
          <p className="hero-text">
            This page comes alive once the local API has synced movement totals or workout sessions.
          </p>
        </section>
        <PageEmptyState
          eyebrow="Activity Data"
          title="No activity summary is available yet."
          description="Point the iPhone bridge at this Baseline instance and run a sync so workouts, steps, and active calories start landing here."
          primaryHref="/"
          primaryLabel="Back to overview"
        />
      </main>
    );
  }

  const stepsChartData = activity.daily.map((entry) => ({
    label: formatShortDate(entry.day),
    value: entry.steps
  }));
  const activeCaloriesChartData = activity.daily.map((entry) => ({
    label: formatShortDate(entry.day),
    value: entry.activeCalories
  }));
  const weeklyWorkoutCountData = activity.weekly.map((entry) => ({
    label: formatShortDate(entry.weekStartDay),
    value: entry.workoutCount
  }));
  const weeklyTrainingTimeData = activity.weekly.map((entry) => ({
    label: formatShortDate(entry.weekStartDay),
    value: Number((entry.totalWorkoutDurationSeconds / 3600).toFixed(1))
  }));

  return (
    <main className="page-shell">
      <SiteHeader currentPath="/activity" />

      <section className="page-intro">
        <div>
          <p className="eyebrow">Activity</p>
          <h1>See how often you actually get out and train.</h1>
        </div>
        <p className="hero-text">
          {`${formatOverviewDate(activity.latestDay)} closes the latest 30-day activity window. ${
            activity.summary.topActivityType
              ? `${activity.summary.topActivityType.label} is currently the most common recorded workout.`
              : "Daily movement is already showing up, and workout sessions will appear here once they have synced."
          }`}
        </p>
        {!activity.syncGuidance.configured ? (
          <div className="integration-banner warning">
            <strong>Apple Health ingestion is not configured yet</strong>
            <p>
              Add an `API_TOKEN` to the API environment and point the iPhone bridge app at this
              Baseline instance to start syncing workouts, calories, and steps.
            </p>
          </div>
        ) : null}
        {activity.syncGuidance.lastErrorMessage ? (
          <div className="integration-banner warning">
            <strong>Latest Apple Health sync needs attention</strong>
            <p>
              {activity.syncGuidance.lastErrorMessage}
            </p>
          </div>
        ) : null}
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">Workouts This Week</span>
          <strong className="metric-value">{activity.summary.workoutsThisWeek}</strong>
          <span className="metric-detail">Recorded sessions over the latest 7 days.</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">30-Day Workout Calories</span>
          <strong className="metric-value">
            {activity.totals.totalCalories30d !== null
              ? `${formatNumber(activity.totals.totalCalories30d)}`
              : "--"}
          </strong>
          <span className="metric-detail">
            Total active calories reported on recorded workouts over the latest 30 days.
          </span>
        </article>
        <article className="metric-card">
          <span className="metric-label">7-Day Steps Avg</span>
          <strong className="metric-value">
            {activity.summary.averageSteps7d !== null
              ? formatNumber(activity.summary.averageSteps7d)
              : "--"}
          </strong>
          <span className="metric-detail">Average daily steps across the past week.</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Top Activity</span>
          <strong className="metric-value">
            {activity.summary.topActivityType?.label ?? "--"}
          </strong>
          <span className="metric-detail">
            {activity.summary.topActivityType
              ? `${activity.summary.topActivityType.workoutCount} session${
                  activity.summary.topActivityType.workoutCount === 1 ? "" : "s"
                } in the latest 30 days.`
              : "No workout sessions have synced yet."}
          </span>
        </article>
      </section>

      <section className="status-grid">
        <article className="status-card">
          <p className="eyebrow">Training Cadence</p>
          <strong className="status-title">{activity.summary.trainingDays30d} active days</strong>
          <span className="metric-detail">
            Days in the latest 30-day window with at least one recorded workout session.
          </span>
        </article>
        <article className="status-card">
          <p className="eyebrow">Apple Health Sync</p>
          <strong className="status-title">
            {activity.syncGuidance.latestStatus}
          </strong>
          <span className="metric-detail">
            {activity.syncGuidance.latestSuccessfulSyncAt
              ? `Last successful sync: ${formatOverviewDate(activity.syncGuidance.latestSuccessfulSyncAt)}`
              : "No successful Apple Health sync has been recorded yet."}
          </span>
        </article>
      </section>

      <section className="trend-grid">
        <article className="chart-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">30-Day</p>
              <h2>Daily steps</h2>
            </div>
            <span className="chart-caption">Movement volume</span>
          </div>
          <TrendChart
            data={stepsChartData}
            dataKey="value"
            decimals={0}
            label="Steps"
          />
        </article>

        <article className="chart-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">12-Week</p>
              <h2>Workout frequency</h2>
            </div>
            <span className="chart-caption">Sessions per week</span>
          </div>
          <TrendChart
            data={weeklyWorkoutCountData}
            dataKey="value"
            decimals={0}
            label="Workout Count"
          />
        </article>

        <article className="chart-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">30-Day</p>
              <h2>Active calories</h2>
            </div>
            <span className="chart-caption">
              7-day avg{" "}
              {activity.summary.averageActiveCalories7d !== null
                ? `${formatNumber(activity.summary.averageActiveCalories7d)} kcal`
                : "--"}
            </span>
          </div>
          <TrendChart
            data={activeCaloriesChartData}
            dataKey="value"
            decimals={0}
            label="Active Calories"
            suffix=" kcal"
          />
        </article>

        <article className="chart-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">12-Week</p>
              <h2>Training time</h2>
            </div>
            <span className="chart-caption">Hours per week</span>
          </div>
          <TrendChart
            data={weeklyTrainingTimeData}
            dataKey="value"
            decimals={1}
            label="Training Time"
            suffix=" h"
          />
        </article>
      </section>

      <section className="section-grid">
        <article className="list-panel">
          <div className="card-header">
            <div>
              <p className="eyebrow">30-Day Mix</p>
              <h2>What you are doing most</h2>
            </div>
          </div>
          <div className="activity-breakdown-list">
            {activity.breakdown.length ? (
              activity.breakdown.map((entry) => {
                const width = Math.max(
                  10,
                  Math.round((entry.workoutCount / activity.breakdown[0]!.workoutCount) * 100)
                );

                return (
                  <article key={entry.key} className="activity-breakdown-row">
                    <div className="activity-breakdown-copy">
                      <div className="activity-breakdown-heading">
                        <strong>{entry.label}</strong>
                        <span className="metric-detail">
                          {entry.workoutCount} session{entry.workoutCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="activity-breakdown-bar">
                        <span
                          className="activity-breakdown-fill"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                    <div className="activity-breakdown-stats">
                      <span>{formatDuration(entry.totalDurationSeconds)}</span>
                      <span className="metric-detail">
                        {entry.totalDistanceMeters !== null
                          ? formatDistanceMeters(entry.totalDistanceMeters)
                          : entry.totalCalories !== null
                            ? `${formatNumber(entry.totalCalories)} kcal`
                            : "Tracked"}
                      </span>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="chart-empty">
                <strong>Workout mix will appear after sessions have synced.</strong>
                <span className="metric-detail">
                  Daily activity totals are already available, but no workout sessions are stored yet.
                </span>
              </div>
            )}
          </div>
        </article>

        <article className="list-panel">
          <div className="card-header">
            <div>
              <p className="eyebrow">Recent Workouts</p>
              <h2>The latest recorded sessions</h2>
            </div>
          </div>
          <div className="workout-list">
            {activity.recentWorkouts.length ? (
              activity.recentWorkouts.map((workout) => (
                <article key={workout.id} className="workout-row">
                  <div className="workout-row-copy">
                    <strong>{workout.label ?? workout.activityLabel}</strong>
                    <p>
                      {formatOverviewDate(workout.startTime ?? workout.day)}
                      {workout.startTime
                        ? ` • ${new Intl.DateTimeFormat("en-US", {
                            hour: "numeric",
                            minute: "2-digit"
                          }).format(new Date(workout.startTime))}`
                        : ""}
                    </p>
                  </div>
                  <div className="workout-row-meta">
                    <span className="data-badge neutral">
                      {formatWorkoutIntensity(workout.intensity)}
                    </span>
                    <span>{formatDuration(workout.durationSeconds)}</span>
                    <span className="metric-detail">
                      {workout.distanceMeters !== null
                        ? formatDistanceMeters(workout.distanceMeters)
                        : workout.calories !== null
                          ? `${formatNumber(workout.calories)} kcal`
                          : formatWorkoutSource(workout.sourceType)}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="chart-empty">
                <strong>Recent workouts will land here after sync.</strong>
                <span className="metric-detail">
                  Once the iPhone bridge sends its first workout batch, this feed will list runs,
                  gym sessions, rows, paddles, and other training records.
                </span>
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
