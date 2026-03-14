import { AnomalySeverity } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";
import { getOrCreatePrimaryUser } from "../auth/single-user.service.js";
import { computeBaselineSnapshot } from "./baseline.service.js";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, delta: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + delta);

  return formatDate(date);
}

type AnomalyDetectionInput = {
  baseline: {
    hrvBaseline: number | null;
    restingHrBaseline: number | null;
    sleepDurationBaseline: number | null;
    temperatureBaseline: number | null;
  };
  recoveryInput: {
    hrv: number | null;
    restingHeartRate: number | null;
    temperatureDeviation: number | null;
  };
  sleep: {
    totalSleepSeconds: number;
  };
};

export function detectAnomalies(input: AnomalyDetectionInput) {
  const anomalies = [];

  if (
    input.baseline.hrvBaseline !== null &&
    input.recoveryInput.hrv !== null &&
    input.recoveryInput.hrv <= input.baseline.hrvBaseline - 8
  ) {
    anomalies.push({
      type: "low_hrv",
      severity: AnomalySeverity.medium,
      title: "HRV dipped below baseline",
      description: "HRV is meaningfully below your rolling personal baseline."
    });
  }

  if (
    input.baseline.restingHrBaseline !== null &&
    input.recoveryInput.restingHeartRate !== null &&
    input.recoveryInput.restingHeartRate >= input.baseline.restingHrBaseline + 4
  ) {
    anomalies.push({
      type: "elevated_resting_hr",
      severity: AnomalySeverity.medium,
      title: "Resting heart rate is elevated",
      description: "Resting heart rate is above your recent personal baseline."
    });
  }

  if (
    input.baseline.temperatureBaseline !== null &&
    input.recoveryInput.temperatureDeviation !== null &&
    Math.abs(input.recoveryInput.temperatureDeviation - input.baseline.temperatureBaseline) >= 0.3
  ) {
    anomalies.push({
      type: "temperature_shift",
      severity: AnomalySeverity.low,
      title: "Temperature deviation is elevated",
      description: "Temperature is outside the usual baseline range for recent days."
    });
  }

  if (
    input.baseline.sleepDurationBaseline !== null &&
    input.sleep.totalSleepSeconds <= input.baseline.sleepDurationBaseline - 90 * 60
  ) {
    anomalies.push({
      type: "short_sleep",
      severity: AnomalySeverity.high,
      title: "Sleep duration dropped",
      description: "Sleep duration is materially below your recent baseline."
    });
  }

  return anomalies;
}

export async function computeAnomaliesForDay(day: string) {
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
    return [];
  }

  await prisma.anomalyFlag.deleteMany({
    where: {
      userId: user.id,
      day: new Date(`${day}T00:00:00.000Z`)
    }
  });

  const anomalies = detectAnomalies({
    baseline,
    recoveryInput,
    sleep
  });

  if (anomalies.length === 0) {
    return [];
  }

  await prisma.anomalyFlag.createMany({
    data: anomalies.map((anomaly) => ({
      userId: user.id,
      day: new Date(`${day}T00:00:00.000Z`),
      ...anomaly
    }))
  });

  return prisma.anomalyFlag.findMany({
    where: {
      userId: user.id,
      day: new Date(`${day}T00:00:00.000Z`)
    },
    orderBy: [
      { severity: "desc" },
      { createdAt: "asc" }
    ]
  });
}

export async function getLatestAnomalies() {
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
    return [];
  }

  return computeAnomaliesForDay(formatDate(latestRecoveryDay.day));
}

export async function getRecentAnomalies(limit = 30) {
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
    return [];
  }

  const latestDay = formatDate(latestRecoveryDay.day);
  const lookbackStart = new Date(`${addDays(latestDay, -29)}T00:00:00.000Z`);

  const recoveryDays = await prisma.dailyRecoveryInput.findMany({
    where: {
      userId: user.id,
      day: {
        gte: lookbackStart,
        lte: latestRecoveryDay.day
      }
    },
    select: {
      day: true
    },
    orderBy: {
      day: "asc"
    }
  });

  await Promise.all(
    recoveryDays.map((row) => computeAnomaliesForDay(formatDate(row.day)))
  );

  return prisma.anomalyFlag.findMany({
    where: {
      userId: user.id,
      day: {
        gte: lookbackStart,
        lte: latestRecoveryDay.day
      }
    },
    orderBy: [
      { day: "desc" },
      { severity: "desc" },
      { createdAt: "asc" }
    ],
    take: limit
  });
}
