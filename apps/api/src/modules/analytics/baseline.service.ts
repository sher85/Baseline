import { prisma } from "../../lib/prisma.js";
import { getOrCreatePrimaryUser } from "../auth/single-user.service.js";
import { average, median, round } from "./analytics-math.js";

const HRV_BASELINE_WINDOW_DAYS = 21;
const RESTING_HR_BASELINE_WINDOW_DAYS = 21;
const SLEEP_BASELINE_WINDOW_DAYS = 14;
const TEMPERATURE_BASELINE_WINDOW_DAYS = 21;

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

function filterNumbers(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => typeof value === "number");
}

function withRoundedValue(value: number | null, digits = 2) {
  return value === null ? null : round(value, digits);
}

function withRoundedInteger(value: number | null) {
  return value === null ? null : Math.round(value);
}

export async function computeBaselineSnapshot(day: string) {
  const user = await getOrCreatePrimaryUser();
  const startDate = addDays(day, -(Math.max(
    HRV_BASELINE_WINDOW_DAYS,
    RESTING_HR_BASELINE_WINDOW_DAYS,
    SLEEP_BASELINE_WINDOW_DAYS,
    TEMPERATURE_BASELINE_WINDOW_DAYS
  )));

  const [sleepRows, recoveryRows] = await Promise.all([
    prisma.dailySleep.findMany({
      where: {
        userId: user.id,
        day: {
          gte: asUtcDate(startDate),
          lt: asUtcDate(day)
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
          gte: asUtcDate(startDate),
          lt: asUtcDate(day)
        }
      },
      orderBy: {
        day: "asc"
      }
    })
  ]);

  const hrvBaseline = average(
    filterNumbers(recoveryRows.slice(-HRV_BASELINE_WINDOW_DAYS).map((row) => row.hrv))
  );
  const restingHrBaseline = average(
    filterNumbers(
      recoveryRows.slice(-RESTING_HR_BASELINE_WINDOW_DAYS).map((row) => row.restingHeartRate)
    )
  );
  const sleepDurationBaseline = average(
    filterNumbers(
      sleepRows.slice(-SLEEP_BASELINE_WINDOW_DAYS).map((row) => row.totalSleepSeconds)
    )
  );
  const temperatureBaseline = median(
    filterNumbers(
      recoveryRows
        .slice(-TEMPERATURE_BASELINE_WINDOW_DAYS)
        .map((row) => row.temperatureDeviation)
    )
  );

  const snapshot = await prisma.baselineSnapshot.upsert({
    where: {
      userId_day: {
        userId: user.id,
        day: asUtcDate(day)
      }
    },
    update: {
      hrvBaseline: withRoundedValue(hrvBaseline),
      restingHrBaseline: withRoundedValue(restingHrBaseline),
      temperatureBaseline: withRoundedValue(temperatureBaseline),
      sleepDurationBaseline: withRoundedInteger(sleepDurationBaseline)
    },
    create: {
      userId: user.id,
      day: asUtcDate(day),
      hrvBaseline: withRoundedValue(hrvBaseline),
      restingHrBaseline: withRoundedValue(restingHrBaseline),
      temperatureBaseline: withRoundedValue(temperatureBaseline),
      sleepDurationBaseline: withRoundedInteger(sleepDurationBaseline)
    }
  });

  return snapshot;
}

export async function getLatestBaselineSnapshot() {
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

  return computeBaselineSnapshot(formatDate(latestRecoveryDay.day));
}
