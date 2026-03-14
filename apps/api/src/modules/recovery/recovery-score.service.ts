import { prisma } from "../../lib/prisma.js";
import { getOrCreatePrimaryUser } from "../auth/single-user.service.js";
import { clamp, round } from "../analytics/analytics-math.js";
import { computeBaselineSnapshot } from "../analytics/baseline.service.js";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function describeDirection(value: number, positiveLabel: string, negativeLabel: string) {
  if (value > 0) {
    return positiveLabel;
  }

  if (value < 0) {
    return negativeLabel;
  }

  return "near baseline";
}

function buildRecoveryExplanation(input: {
  hrvDelta: number;
  restingHrDelta: number;
  sleepDeltaSeconds: number;
  temperatureDelta: number;
}) {
  const segments = [
    `HRV is ${describeDirection(input.hrvDelta, "above baseline", "below baseline")}`,
    `resting heart rate is ${describeDirection(
      -input.restingHrDelta,
      "better than baseline",
      "elevated versus baseline"
    )}`,
    `sleep duration is ${describeDirection(
      input.sleepDeltaSeconds,
      "above baseline",
      "below baseline"
    )}`,
    `temperature is ${describeDirection(
      -Math.abs(input.temperatureDelta),
      "stable",
      "showing a positive deviation"
    )}`
  ];

  return `Recovery reflects a mix of signals: ${segments.join(", ")}.`;
}

export async function computeRecoveryForDay(day: string) {
  const user = await getOrCreatePrimaryUser();

  const [recoveryInput, sleep, baseline] = await Promise.all([
    prisma.dailyRecoveryInput.findUnique({
      where: {
        userId_day: {
          userId: user.id,
          day: new Date(`${day}T00:00:00.000Z`)
        }
      }
    }),
    prisma.dailySleep.findUnique({
      where: {
        userId_day: {
          userId: user.id,
          day: new Date(`${day}T00:00:00.000Z`)
        }
      }
    }),
    computeBaselineSnapshot(day)
  ]);

  if (!recoveryInput || !sleep) {
    return null;
  }

  const hrvDelta =
    recoveryInput.hrv !== null && baseline.hrvBaseline !== null
      ? recoveryInput.hrv - baseline.hrvBaseline
      : 0;
  const restingHrDelta =
    recoveryInput.restingHeartRate !== null && baseline.restingHrBaseline !== null
      ? recoveryInput.restingHeartRate - baseline.restingHrBaseline
      : 0;
  const sleepDeltaSeconds =
    baseline.sleepDurationBaseline !== null
      ? sleep.totalSleepSeconds - baseline.sleepDurationBaseline
      : 0;
  const temperatureDelta =
    recoveryInput.temperatureDeviation !== null && baseline.temperatureBaseline !== null
      ? recoveryInput.temperatureDeviation - baseline.temperatureBaseline
      : 0;

  const hrvContribution = clamp(hrvDelta / 12, -1, 1);
  const restingHrContribution = clamp((-restingHrDelta) / 6, -1, 1);
  const sleepContribution = clamp(sleepDeltaSeconds / (90 * 60), -1, 1);
  const temperatureContribution = clamp((-Math.abs(temperatureDelta)) / 0.5, -1, 1);

  const weightedScore =
    78 +
    hrvContribution * 10 +
    restingHrContribution * 8 +
    sleepContribution * 7 +
    temperatureContribution * 5;

  const score = Math.round(clamp(weightedScore, 0, 100));
  const confidenceSignals = [
    baseline.hrvBaseline,
    baseline.restingHrBaseline,
    baseline.sleepDurationBaseline,
    baseline.temperatureBaseline
  ].filter((value) => value !== null).length;
  const confidence = round(confidenceSignals / 4, 2);
  const explanationSummary = buildRecoveryExplanation({
    hrvDelta,
    restingHrDelta,
    sleepDeltaSeconds,
    temperatureDelta
  });

  return prisma.recoveryScore.upsert({
    where: {
      userId_day: {
        userId: user.id,
        day: new Date(`${day}T00:00:00.000Z`)
      }
    },
    update: {
      score,
      confidence,
      hrvContribution: round(hrvContribution, 3),
      restingHrContribution: round(restingHrContribution, 3),
      sleepContribution: round(sleepContribution, 3),
      temperatureContribution: round(temperatureContribution, 3),
      explanationSummary
    },
    create: {
      userId: user.id,
      day: new Date(`${day}T00:00:00.000Z`),
      score,
      confidence,
      hrvContribution: round(hrvContribution, 3),
      restingHrContribution: round(restingHrContribution, 3),
      sleepContribution: round(sleepContribution, 3),
      temperatureContribution: round(temperatureContribution, 3),
      explanationSummary
    }
  });
}

export async function getLatestRecoveryScore() {
  const user = await getOrCreatePrimaryUser();

  const latestRecoveryDay = await prisma.dailyRecoveryInput.findFirst({
    where: {
      userId: user.id
    },
    orderBy: {
      day: "desc"
    },
    select: {
      day: true
    }
  });

  if (!latestRecoveryDay) {
    return null;
  }

  return computeRecoveryForDay(formatDate(latestRecoveryDay.day));
}
