import { prisma } from "../../lib/prisma.js";
import { getLatestAnomalies, getRecentAnomalies } from "../analytics/anomaly.service.js";
import { getLatestBaselineSnapshot } from "../analytics/baseline.service.js";
import { getOrCreatePrimaryUser } from "../auth/single-user.service.js";
import { getLatestRecoveryDetail } from "./recovery-detail.service.js";
import { getLatestSleepSummary } from "./sleep.service.js";
import { getTrendSummary, type TrendWindow } from "./trends.service.js";
import { getOuraSyncStatus } from "../sync/oura-sync.service.js";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return null;
  }

  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

function buildDailyBriefSummary(input: {
  recoveryScore: number;
  explanationSummary: string;
  anomalyCount: number;
  sleepNote: string;
}) {
  const anomalySegment =
    input.anomalyCount > 0
      ? `${input.anomalyCount} anomaly flag${input.anomalyCount === 1 ? "" : "s"} fired.`
      : "No anomaly flags fired.";

  return `${input.explanationSummary} ${input.sleepNote} ${anomalySegment}`;
}

export async function getAiDailyBrief() {
  const [recovery, sleep, baseline, latestAnomalies, syncStatus] = await Promise.all([
    getLatestRecoveryDetail(),
    getLatestSleepSummary(),
    getLatestBaselineSnapshot(),
    getLatestAnomalies(),
    getOuraSyncStatus()
  ]);

  if (!recovery || !sleep || !baseline) {
    return null;
  }

  return {
    generated_at: new Date().toISOString(),
    day: recovery.day,
    recovery_score: recovery.score,
    recovery_confidence: recovery.confidence,
    explanation_summary: recovery.explanationSummary,
    sleep_seconds: sleep.totals.sleepSeconds,
    sleep_human: formatDuration(sleep.totals.sleepSeconds),
    sleep_delta_seconds: sleep.baseline.durationDeltaSeconds,
    hrv: recovery.vitals.hrv,
    hrv_baseline: baseline.hrvBaseline,
    resting_heart_rate: recovery.vitals.restingHeartRate,
    resting_heart_rate_baseline: baseline.restingHrBaseline,
    temperature_deviation: recovery.vitals.temperatureDeviation,
    temperature_baseline: baseline.temperatureBaseline,
    anomaly_count: latestAnomalies.length,
    anomaly_titles: latestAnomalies.map((anomaly) => anomaly.title),
    sync_status: syncStatus.latestRun?.status ?? "idle",
    last_synced_at: syncStatus.latestRun?.finishedAt?.toISOString() ?? null,
    summary_text: buildDailyBriefSummary({
      recoveryScore: recovery.score,
      explanationSummary: recovery.explanationSummary,
      anomalyCount: latestAnomalies.length,
      sleepNote: sleep.note
    })
  };
}

export async function getAiLastNightSummary() {
  const sleep = await getLatestSleepSummary();

  if (!sleep) {
    return null;
  }

  return {
    day: sleep.day,
    sleep_total_seconds: sleep.totals.sleepSeconds,
    sleep_total_human: formatDuration(sleep.totals.sleepSeconds),
    time_in_bed_seconds: sleep.totals.timeInBedSeconds,
    time_in_bed_human: formatDuration(sleep.totals.timeInBedSeconds),
    sleep_efficiency: sleep.totals.efficiency,
    sleep_latency_seconds: sleep.totals.latencySeconds,
    sleep_latency_human: formatDuration(sleep.totals.latencySeconds),
    bedtime_start: sleep.timing.bedtimeStart,
    bedtime_end: sleep.timing.bedtimeEnd,
    average_sleep_hr: sleep.vitals.averageHr,
    lowest_sleep_hr: sleep.vitals.lowestHr,
    average_sleep_hrv: sleep.vitals.averageHrv,
    sleep_baseline_seconds: sleep.baseline.sleepDurationSeconds,
    sleep_delta_seconds: sleep.baseline.durationDeltaSeconds,
    note: sleep.note
  };
}

export async function getAiRecoverySummary() {
  const [recovery, baseline] = await Promise.all([
    getLatestRecoveryDetail(),
    getLatestBaselineSnapshot()
  ]);

  if (!recovery || !baseline) {
    return null;
  }

  return {
    day: recovery.day,
    recovery_score: recovery.score,
    confidence: recovery.confidence,
    explanation_summary: recovery.explanationSummary,
    hrv: recovery.vitals.hrv,
    hrv_baseline: baseline.hrvBaseline,
    resting_heart_rate: recovery.vitals.restingHeartRate,
    resting_heart_rate_baseline: baseline.restingHrBaseline,
    temperature_deviation: recovery.vitals.temperatureDeviation,
    temperature_baseline: baseline.temperatureBaseline,
    sleep_seconds: recovery.vitals.sleepSeconds,
    sleep_baseline_seconds: baseline.sleepDurationBaseline,
    hrv_contribution: recovery.factors.find((factor) => factor.key === "hrv")?.contribution ?? null,
    resting_heart_rate_contribution:
      recovery.factors.find((factor) => factor.key === "restingHeartRate")?.contribution ?? null,
    sleep_contribution:
      recovery.factors.find((factor) => factor.key === "sleepDuration")?.contribution ?? null,
    temperature_contribution:
      recovery.factors.find((factor) => factor.key === "temperature")?.contribution ?? null,
    factors: recovery.factors.map((factor) => ({
      key: factor.key,
      label: factor.label,
      status: factor.status,
      current_value: factor.currentValue,
      baseline_value: factor.baselineValue,
      contribution: factor.contribution,
      unit: factor.unit,
      detail: factor.detail
    })),
    anomaly_count: recovery.anomalies.length,
    anomaly_titles: recovery.anomalies.map((anomaly) => anomaly.title)
  };
}

export async function getAiAnomalySummary() {
  const user = await getOrCreatePrimaryUser();
  const [latestAnomalies, recentAnomalies, latestRecoveryDay] = await Promise.all([
    getLatestAnomalies(),
    getRecentAnomalies(20),
    prisma.dailyRecoveryInput.findFirst({
      where: {
        userId: user.id
      },
      orderBy: {
        day: "desc"
      },
      select: {
        day: true
      }
    })
  ]);

  if (!latestRecoveryDay) {
    return null;
  }

  return {
    day: latestRecoveryDay.day.toISOString(),
    latest_flag_count: latestAnomalies.length,
    recent_flag_count: recentAnomalies.length,
    latest_titles: latestAnomalies.map((anomaly) => anomaly.title),
    items: recentAnomalies.map((anomaly) => ({
      day: anomaly.day.toISOString(),
      type: anomaly.type,
      severity: anomaly.severity,
      title: anomaly.title,
      description: anomaly.description
    })),
    summary_text:
      latestAnomalies.length > 0
        ? `Latest day has ${latestAnomalies.length} anomaly flag${latestAnomalies.length === 1 ? "" : "s"}.`
        : "Latest day has no anomaly flags."
  };
}

export async function getAiContext(window: TrendWindow) {
  const trendSummary = await getTrendSummary(window);

  if (!trendSummary) {
    return null;
  }

  return {
    generated_at: trendSummary.generatedAt,
    window: trendSummary.window,
    start_day: trendSummary.range.startDay,
    end_day: trendSummary.range.endDay,
    average_recovery_score: trendSummary.summary.averageRecoveryScore,
    average_sleep_seconds: trendSummary.summary.averageSleepSeconds,
    average_sleep_human: formatDuration(trendSummary.summary.averageSleepSeconds),
    average_hrv: trendSummary.summary.averageHrv,
    days_with_anomalies: trendSummary.summary.daysWithAnomalies,
    series: trendSummary.series.map((point) => ({
      day: point.day,
      recovery_score: point.recoveryScore,
      sleep_seconds: point.sleepSeconds,
      hrv: point.hrv,
      resting_heart_rate: point.restingHeartRate,
      temperature_deviation: point.temperatureDeviation,
      steps: point.steps,
      anomaly_count: point.anomalyCount
    }))
  };
}
