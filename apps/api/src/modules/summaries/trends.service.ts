import { prisma } from "../../lib/prisma.js";
import { getOrCreatePrimaryUser } from "../auth/single-user.service.js";
import { computeAnomaliesForDay } from "../analytics/anomaly.service.js";
import { average, round } from "../analytics/analytics-math.js";
import { computeRecoveryForDay } from "../recovery/recovery-score.service.js";

const WINDOW_TO_DAYS = {
  "7d": 7,
  "30d": 30
} as const;

export type TrendWindow = keyof typeof WINDOW_TO_DAYS;

function asUtcDate(day: string) {
  return new Date(`${day}T00:00:00.000Z`);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, delta: number) {
  const date = asUtcDate(day);
  date.setUTCDate(date.getUTCDate() + delta);

  return formatDate(date);
}

function createDateRange(endDay: string, days: number) {
  return Array.from({ length: days }, (_, index) =>
    addDays(endDay, -(days - 1) + index)
  );
}

function toKeyedMap<T extends { day: Date }>(rows: T[]) {
  return new Map(rows.map((row) => [formatDate(row.day), row]));
}

function countByDay<T extends { day: Date }>(rows: T[]) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const key = formatDate(row.day);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function averageOf(values: Array<number | null>) {
  const computedAverage = average(
    values.filter((value): value is number => value !== null)
  );

  return computedAverage === null ? null : round(computedAverage, 1);
}

export async function getTrendSummary(window: TrendWindow) {
  const user = await getOrCreatePrimaryUser();
  const latestDayRow = await prisma.dailyRecoveryInput.findFirst({
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

  if (!latestDayRow) {
    return null;
  }

  const latestDay = formatDate(latestDayRow.day);
  const days = createDateRange(latestDay, WINDOW_TO_DAYS[window]);
  const startDay = days[0];

  if (!startDay) {
    return null;
  }

  const startDate = asUtcDate(startDay);
  const endDateExclusive = asUtcDate(addDays(latestDay, 1));

  await Promise.all(
    days.map(async (day) => {
      await Promise.all([computeRecoveryForDay(day), computeAnomaliesForDay(day)]);
    })
  );

  const [sleepRows, recoveryRows, activityRows, scoreRows, anomalyRows] = await Promise.all([
    prisma.dailySleep.findMany({
      where: {
        userId: user.id,
        day: {
          gte: startDate,
          lt: endDateExclusive
        }
      },
      orderBy: {
        day: "asc"
      }
    }),
    prisma.dailyRecoveryInput.findMany({
      where: {
        userId: user.id,
        day: {
          gte: startDate,
          lt: endDateExclusive
        }
      },
      orderBy: {
        day: "asc"
      }
    }),
    prisma.dailyActivity.findMany({
      where: {
        userId: user.id,
        day: {
          gte: startDate,
          lt: endDateExclusive
        }
      },
      orderBy: {
        day: "asc"
      }
    }),
    prisma.recoveryScore.findMany({
      where: {
        userId: user.id,
        day: {
          gte: startDate,
          lt: endDateExclusive
        }
      },
      orderBy: {
        day: "asc"
      }
    }),
    prisma.anomalyFlag.findMany({
      where: {
        userId: user.id,
        day: {
          gte: startDate,
          lt: endDateExclusive
        }
      }
    })
  ]);

  const sleepByDay = toKeyedMap(sleepRows);
  const recoveryByDay = toKeyedMap(recoveryRows);
  const activityByDay = toKeyedMap(activityRows);
  const scoresByDay = toKeyedMap(scoreRows);
  const anomalyCountsByDay = countByDay(anomalyRows);

  const series = days.map((day) => {
    const sleep = sleepByDay.get(day);
    const recovery = recoveryByDay.get(day);
    const activity = activityByDay.get(day);
    const score = scoresByDay.get(day);

    return {
      day,
      recoveryScore: score?.score ?? null,
      sleepSeconds: sleep?.totalSleepSeconds ?? null,
      sleepEfficiency: sleep?.sleepEfficiency ?? null,
      hrv: recovery?.hrv ?? null,
      restingHeartRate: recovery?.restingHeartRate ?? null,
      temperatureDeviation: recovery?.temperatureDeviation ?? null,
      steps: activity?.steps ?? null,
      anomalyCount: anomalyCountsByDay.get(day) ?? 0
    };
  });

  const averageSleepSeconds = average(
    series.map((item) => item.sleepSeconds).filter((value): value is number => value !== null)
  );

  return {
    generatedAt: new Date().toISOString(),
    window,
    range: {
      startDay,
      endDay: latestDay
    },
    summary: {
      averageRecoveryScore: averageOf(series.map((item) => item.recoveryScore)),
      averageSleepSeconds:
        averageSleepSeconds === null ? null : round(averageSleepSeconds, 0),
      averageHrv: averageOf(series.map((item) => item.hrv)),
      daysWithAnomalies: series.filter((item) => item.anomalyCount > 0).length
    },
    series
  };
}
