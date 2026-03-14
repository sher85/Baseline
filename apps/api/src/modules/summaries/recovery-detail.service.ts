import { prisma } from "../../lib/prisma.js";
import { getLatestAnomalies } from "../analytics/anomaly.service.js";
import { getLatestBaselineSnapshot } from "../analytics/baseline.service.js";
import { getOrCreatePrimaryUser } from "../auth/single-user.service.js";
import { getLatestRecoveryScore } from "../recovery/recovery-score.service.js";

type FactorStatus = "positive" | "negative" | "neutral";

function getFactorStatus(value: number | null): FactorStatus {
  if (value === null || Math.abs(value) < 0.1) {
    return "neutral";
  }

  return value > 0 ? "positive" : "negative";
}

export async function getLatestRecoveryDetail() {
  const user = await getOrCreatePrimaryUser();

  const [recovery, baseline, anomalies] = await Promise.all([
    getLatestRecoveryScore(),
    getLatestBaselineSnapshot(),
    getLatestAnomalies()
  ]);

  if (!recovery || !baseline) {
    return null;
  }

  const [latestInput, latestSleep] = await Promise.all([
    prisma.dailyRecoveryInput.findUnique({
      where: {
        userId_day: {
          userId: user.id,
          day: recovery.day
        }
      }
    }),
    prisma.dailySleep.findUnique({
      where: {
        userId_day: {
          userId: user.id,
          day: recovery.day
        }
      }
    })
  ]);

  if (!latestInput || !latestSleep) {
    return null;
  }

  const factors = [
    {
      key: "hrv",
      label: "HRV",
      contribution: recovery.hrvContribution,
      status: getFactorStatus(recovery.hrvContribution),
      currentValue: latestInput.hrv,
      baselineValue: baseline.hrvBaseline,
      unit: "ms",
      detail: "Higher HRV relative to baseline generally supports recovery."
    },
    {
      key: "restingHeartRate",
      label: "Resting HR",
      contribution: recovery.restingHrContribution,
      status: getFactorStatus(recovery.restingHrContribution),
      currentValue: latestInput.restingHeartRate,
      baselineValue: baseline.restingHrBaseline,
      unit: "bpm",
      detail: "Lower resting heart rate versus baseline is treated as favorable."
    },
    {
      key: "sleepDuration",
      label: "Sleep Duration",
      contribution: recovery.sleepContribution,
      status: getFactorStatus(recovery.sleepContribution),
      currentValue: latestSleep.totalSleepSeconds,
      baselineValue: baseline.sleepDurationBaseline,
      unit: "seconds",
      detail: "Sleep duration influences recovery through the 14-day sleep baseline."
    },
    {
      key: "temperature",
      label: "Temperature",
      contribution: recovery.temperatureContribution,
      status: getFactorStatus(recovery.temperatureContribution),
      currentValue: latestInput.temperatureDeviation,
      baselineValue: baseline.temperatureBaseline,
      unit: "degC",
      detail: "Temperature stability is rewarded; larger deviations lower the score."
    }
  ];

  return {
    day: recovery.day.toISOString(),
    score: recovery.score,
    confidence: recovery.confidence,
    explanationSummary: recovery.explanationSummary,
    vitals: {
      hrv: latestInput.hrv,
      restingHeartRate: latestInput.restingHeartRate,
      temperatureDeviation: latestInput.temperatureDeviation,
      sleepSeconds: latestSleep.totalSleepSeconds
    },
    factors,
    anomalies: anomalies.map((anomaly) => ({
      severity: anomaly.severity,
      title: anomaly.title,
      description: anomaly.description
    }))
  };
}
