import { PageEmptyState } from "../../components/page-empty-state";
import { SiteHeader } from "../../components/site-header";
import { WeeklyBarTrendChart } from "../../components/weekly-bar-trend-chart";
import { WorkoutFrequencyChart } from "../../components/workout-frequency-chart";
import {
  formatDistanceMeters,
  formatDuration,
  formatNumber,
  formatOverviewDate,
  formatShortDate
} from "../../lib/format";
import { getActivityData } from "../../services/analytics";

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (match) => match.toUpperCase());
}

function withMovingAverage<T extends { value: number | null }>(data: T[], alpha = 0.4) {
  let previousAverage: number | null = null;

  return data.map((entry) => {
    if (entry.value === null) {
      return {
        ...entry,
        ema: previousAverage
      };
    }

    previousAverage =
      previousAverage === null
        ? entry.value
        : alpha * entry.value + (1 - alpha) * previousAverage;

    return {
      ...entry,
      ema: Number(previousAverage.toFixed(2))
    };
  });
}

const WORKOUT_SERIES_PRIORITY: Record<string, number> = {
  running: 0,
  weight_lifting: 1,
  kayaking: 2,
  rowing: 3,
  cycling: 4,
  walking: 5,
  pickleball: 6,
  workout: 7,
  unmapped: 98,
  other: 99
};

function formatWorkoutIntensity(value: string | null) {
  if (!value) {
    return "Recorded";
  }

  return toTitleCase(value);
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
            <h1>See How Often You Actually Get Out And Train.</h1>
          </div>
          <p className="hero-text">
            This page comes alive once the local API has synced movement totals or workout sessions.
          </p>
        </section>
        <PageEmptyState
          eyebrow="Activity Data"
          title="No Activity Summary Is Available Yet."
          description="Point the iPhone bridge at this Baseline instance and run a sync so workouts, steps, and active calories start landing here."
          primaryHref="/"
          primaryLabel="Back To Overview"
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
            <h1>See How Often You Actually Get Out And Train.</h1>
          </div>
          <p className="hero-text">
            This page comes alive once the local API has synced movement totals or workout sessions.
          </p>
        </section>
        <PageEmptyState
          eyebrow="Activity Data"
          title="No Activity Summary Is Available Yet."
          description="Point the iPhone bridge at this Baseline instance and run a sync so workouts, steps, and active calories start landing here."
          primaryHref="/"
          primaryLabel="Back To Overview"
        />
      </main>
    );
  }

  const chartSyncId = "activity-weekly-charts";
  const weeklyStepsChartData = withMovingAverage(
    activity.weekly.map((entry) => ({
      label: formatShortDate(entry.weekStartDay),
      value: entry.steps
    }))
  );
  const weeklyActiveCaloriesChartData = withMovingAverage(
    activity.weekly.map((entry) => ({
      label: formatShortDate(entry.weekStartDay),
      value: entry.activeCalories
    }))
  );
  const workoutFrequencySeries = Array.from(
    activity.weekly
      .flatMap((entry) => entry.workoutTypes)
      .reduce(
        (map, entry) => {
          const existing = map.get(entry.key) ?? {
            key: entry.key,
            label: entry.label,
            total: 0
          };

          existing.total += entry.workoutCount;
          map.set(entry.key, existing);

          return map;
        },
        new Map<string, { key: string; label: string; total: number }>()
      )
      .values()
  )
    .sort((left, right) => {
      const leftPriority = WORKOUT_SERIES_PRIORITY[left.key] ?? 50;
      const rightPriority = WORKOUT_SERIES_PRIORITY[right.key] ?? 50;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return left.label.localeCompare(right.label);
    })
    .map(({ key, label }) => ({ key, label }));
  const weeklyWorkoutFrequencyData = activity.weekly.map((entry) => {
    const workoutTypes = Object.fromEntries(
      entry.workoutTypes.map((workoutType) => [workoutType.key, workoutType.workoutCount])
    );
    const emptyWorkoutTypes = Object.fromEntries(
      workoutFrequencySeries.map((workoutType) => [workoutType.key, 0])
    );

    return {
      label: formatShortDate(entry.weekStartDay),
      total: entry.workoutCount,
      ...emptyWorkoutTypes,
      ...workoutTypes
    };
  });
  const weeklyWorkoutFrequencyWithAverage = withMovingAverage(
    weeklyWorkoutFrequencyData.map((entry) => ({
      ...entry,
      value: entry.total
    }))
  );
  const weeklyTrainingTimeData = withMovingAverage(
    activity.weekly.map((entry) => ({
      label: formatShortDate(entry.weekStartDay),
      value: Number((entry.totalWorkoutDurationSeconds / 3600).toFixed(1))
    }))
  );

  return (
    <main className="page-shell">
      <SiteHeader currentPath="/activity" />

      <section className="page-intro">
        <div>
          <p className="eyebrow">Activity</p>
          <h1>See How Often You Actually Get Out And Train.</h1>
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
            <strong>Apple Health Ingestion Is Not Configured Yet</strong>
            <p>
              Add an `API_TOKEN` to the API environment and point the iPhone bridge app at this
              Baseline instance to start syncing workouts, calories, and steps.
            </p>
          </div>
        ) : null}
        {activity.syncGuidance.lastErrorMessage ? (
          <div className="integration-banner warning">
            <strong>Latest Apple Health Sync Needs Attention</strong>
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
          <strong className="status-title">
            {activity.summary.trainingDays30d} Active Days
          </strong>
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
              <p className="eyebrow">12-Week</p>
              <h2>Weekly Steps</h2>
            </div>
            <span className="chart-caption">Weekly Total With Moving Average</span>
          </div>
          <WeeklyBarTrendChart
            data={weeklyStepsChartData}
            decimals={0}
            label="Steps"
            syncId={chartSyncId}
          />
        </article>

        <article className="chart-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">12-Week</p>
              <h2>Workout Frequency</h2>
            </div>
            <span className="chart-caption">Sessions Per Week</span>
          </div>
          <WorkoutFrequencyChart
            data={weeklyWorkoutFrequencyWithAverage}
            series={workoutFrequencySeries}
            syncId={chartSyncId}
          />
        </article>

        <article className="chart-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">12-Week</p>
              <h2>Active Calories</h2>
            </div>
            <span className="chart-caption">Weekly Total With Moving Average</span>
          </div>
          <WeeklyBarTrendChart
            barColor="#4f8f70"
            data={weeklyActiveCaloriesChartData}
            decimals={0}
            label="Active Calories"
            suffix=" kcal"
            syncId={chartSyncId}
          />
        </article>

        <article className="chart-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">12-Week</p>
              <h2>Training Time</h2>
            </div>
            <span className="chart-caption">Hours Per Week</span>
          </div>
          <WeeklyBarTrendChart
            barColor="#d4815f"
            data={weeklyTrainingTimeData}
            decimals={1}
            label="Training Time"
            suffix=" h"
            syncId={chartSyncId}
          />
        </article>
      </section>

      <section className="section-grid">
        <article className="list-panel">
          <div className="card-header">
            <div>
              <p className="eyebrow">30-Day Mix</p>
              <h2>What You Are Doing Most</h2>
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
                <strong>Workout Mix Will Appear After Sessions Have Synced.</strong>
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
              <h2>The Latest Recorded Sessions</h2>
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
                <strong>Recent Workouts Will Land Here After Sync.</strong>
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
