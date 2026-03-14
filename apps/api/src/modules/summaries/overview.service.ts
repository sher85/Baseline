import { prisma } from "../../lib/prisma.js";
import { getOrCreatePrimaryUser } from "../auth/single-user.service.js";
import { getLatestAnomalies } from "../analytics/anomaly.service.js";
import { getLatestBaselineSnapshot } from "../analytics/baseline.service.js";
import { getLatestRecoveryScore } from "../recovery/recovery-score.service.js";
import { getOuraConnectionStatus } from "../oura/oura-connection.service.js";
import { getOuraSyncStatus } from "../sync/oura-sync.service.js";

function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

function formatSignedNumber(value: number, unit: string, digits = 0) {
  const rounded = Number(value.toFixed(digits));
  const sign = rounded > 0 ? "+" : "";

  return `${sign}${rounded}${unit}`;
}

function formatTemperatureDelta(value: number) {
  return formatSignedNumber(value, " degC", 2);
}

function createMetric(label: string, value: string, detail: string) {
  return { label, value, detail };
}

export async function getLatestOverview() {
  const user = await getOrCreatePrimaryUser();

  const [latestSleep, latestRecoveryInput, baseline, recovery, anomalies, syncStatus, connection] =
    await Promise.all([
      prisma.dailySleep.findFirst({
        where: {
          userId: user.id
        },
        orderBy: {
          day: "desc"
        }
      }),
      prisma.dailyRecoveryInput.findFirst({
        where: {
          userId: user.id
        },
        orderBy: {
          day: "desc"
        }
      }),
      getLatestBaselineSnapshot(),
      getLatestRecoveryScore(),
      getLatestAnomalies(),
      getOuraSyncStatus(),
      getOuraConnectionStatus()
    ]);

  if (!latestSleep || !latestRecoveryInput || !baseline || !recovery) {
    return null;
  }

  const hrvDelta =
    latestRecoveryInput.hrv !== null && baseline.hrvBaseline !== null
      ? latestRecoveryInput.hrv - baseline.hrvBaseline
      : 0;
  const restingHrDelta =
    latestRecoveryInput.restingHeartRate !== null && baseline.restingHrBaseline !== null
      ? latestRecoveryInput.restingHeartRate - baseline.restingHrBaseline
      : 0;
  const sleepDelta =
    baseline.sleepDurationBaseline !== null
      ? latestSleep.totalSleepSeconds - baseline.sleepDurationBaseline
      : 0;
  const temperatureDelta =
    latestRecoveryInput.temperatureDeviation !== null && baseline.temperatureBaseline !== null
      ? latestRecoveryInput.temperatureDeviation - baseline.temperatureBaseline
      : 0;

  const metrics = [
    createMetric(
      "Recovery",
      String(recovery.score),
      recovery.explanationSummary
    ),
    createMetric(
      "HRV",
      latestRecoveryInput.hrv !== null ? `${latestRecoveryInput.hrv} ms` : "N/A",
      baseline.hrvBaseline !== null
        ? `${formatSignedNumber(hrvDelta, " ms")} vs. 21-day baseline`
        : "Baseline still warming up"
    ),
    createMetric(
      "Resting HR",
      latestRecoveryInput.restingHeartRate !== null
        ? `${latestRecoveryInput.restingHeartRate} bpm`
        : "N/A",
      baseline.restingHrBaseline !== null
        ? `${formatSignedNumber(restingHrDelta, " bpm")} vs. baseline`
        : "Baseline still warming up"
    ),
    createMetric(
      "Sleep",
      formatDuration(latestSleep.totalSleepSeconds),
      baseline.sleepDurationBaseline !== null
        ? `${formatSignedNumber(Math.round(sleepDelta / 60), " min")} vs. baseline`
        : `${latestSleep.sleepEfficiency ?? "N/A"}% efficiency`
    )
  ];

  const leadAnomaly = anomalies[0];
  const notes = [
    recovery.explanationSummary,
    leadAnomaly
      ? leadAnomaly.description
      : "No deterministic anomaly flags were triggered for the latest day.",
    `Temperature delta: ${formatTemperatureDelta(temperatureDelta)} against recent baseline.`
  ];

  return {
    generatedAt: new Date().toISOString(),
    day: latestSleep.day.toISOString(),
    metrics,
    notes,
    anomalies: anomalies.map((anomaly) => ({
      severity: anomaly.severity,
      title: anomaly.title,
      description: anomaly.description
    })),
    sync: {
      running: syncStatus.running,
      latestStatus: syncStatus.latestRun?.status ?? "idle",
      lastSyncedAt: syncStatus.latestRun?.finishedAt?.toISOString() ?? null
    },
    connection: {
      connected: connection.connected,
      configured: connection.configured,
      needsReconnect: connection.needsReconnect
    }
  };
}
