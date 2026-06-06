import { SyncSource } from "../../lib/prisma-client.js";
import { prisma } from "../../lib/prisma.js";
import {
  getAppleHealthActivitySnapshots,
  getAppleHealthStatus
} from "../apple-health/apple-health-ingestion.service.js";
import { getOrCreatePrimaryUser } from "../auth/single-user.service.js";
import {
  addDays,
  asUtcDate,
  buildWeekRange,
  createDateRange,
  formatDate,
  normalizeActivityType,
  startOfWeek
} from "../activity/activity-utils.js";

const DAILY_WINDOW_DAYS = 30;
const WEEKLY_WINDOW_WEEKS = 12;
const RECENT_WORKOUT_LIMIT = 10;
const WEEKLY_SUMMARY_DAYS = 7;

function averageOf(values: Array<number | null>) {
  const numbers = values.filter((value): value is number => value !== null);

  if (!numbers.length) {
    return null;
  }

  const total = numbers.reduce((sum, value) => sum + value, 0);

  return Number((total / numbers.length).toFixed(1));
}

function sumOf(values: Array<number | null>) {
  const numbers = values.filter((value): value is number => value !== null);

  if (!numbers.length) {
    return null;
  }

  return numbers.reduce((sum, value) => sum + value, 0);
}

type DayAggregate = {
  totalWorkoutDurationSeconds: number;
  workoutCount: number;
};

function getLatestDate(...dates: Array<Date | null | undefined>) {
  const filtered = dates.filter((value): value is Date => Boolean(value));

  if (!filtered.length) {
    return null;
  }

  return filtered.sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
}

export async function getLatestActivitySummary() {
  const user = await getOrCreatePrimaryUser();
  const [latestActivityRow, latestWorkoutRow, appleHealthStatus, appleHealthSnapshots] =
    await Promise.all([
      prisma.dailyActivity.findFirst({
        where: { userId: user.id },
        orderBy: { day: "desc" },
        select: { day: true }
      }),
      prisma.workoutSession.findFirst({
        where: { userId: user.id },
        orderBy: [{ startTime: "desc" }, { day: "desc" }],
        select: { day: true, source: true }
      }),
      getAppleHealthStatus(),
      getAppleHealthActivitySnapshots(WEEKLY_WINDOW_WEEKS * 7)
    ]);

  const latestDate = getLatestDate(
    latestActivityRow?.day,
    latestWorkoutRow?.day,
    appleHealthSnapshots ? asUtcDate(appleHealthSnapshots.latestDay) : null
  );

  if (!latestDate) {
    return null;
  }

  const latestDay = formatDate(latestDate);
  const dailyDays = createDateRange(latestDay, DAILY_WINDOW_DAYS);
  const dailyStartDay = dailyDays[0];
  const weeklyStartDay = addDays(startOfWeek(latestDay), -((WEEKLY_WINDOW_WEEKS - 1) * 7));

  if (!dailyStartDay) {
    return null;
  }

  const shouldPreferAppleHealth =
    Boolean(appleHealthSnapshots?.days.size) || latestWorkoutRow?.source === SyncSource.apple_health;
  const workoutSourceFilter = shouldPreferAppleHealth
    ? {
        source: SyncSource.apple_health
      }
    : {};

  const [dailyActivityRows, recentWorkoutRows, workoutRowsForDailyWindow, workoutRowsForWeeklyWindow] =
    await Promise.all([
      prisma.dailyActivity.findMany({
        where: {
          userId: user.id,
          day: {
            gte: asUtcDate(weeklyStartDay),
            lt: asUtcDate(addDays(latestDay, 1))
          }
        },
        orderBy: {
          day: "asc"
        }
      }),
      prisma.workoutSession.findMany({
        where: {
          userId: user.id,
          ...workoutSourceFilter
        },
        orderBy: [{ startTime: "desc" }, { day: "desc" }],
        take: RECENT_WORKOUT_LIMIT
      }),
      prisma.workoutSession.findMany({
        where: {
          userId: user.id,
          ...workoutSourceFilter,
          day: {
            gte: asUtcDate(dailyStartDay),
            lt: asUtcDate(addDays(latestDay, 1))
          }
        },
        orderBy: [{ startTime: "asc" }, { day: "asc" }]
      }),
      prisma.workoutSession.findMany({
        where: {
          userId: user.id,
          ...workoutSourceFilter,
          day: {
            gte: asUtcDate(weeklyStartDay),
            lt: asUtcDate(addDays(latestDay, 1))
          }
        },
        orderBy: [{ startTime: "asc" }, { day: "asc" }]
      })
    ]);

  const dailyActivityByDay = new Map(
    dailyActivityRows.map((row) => [formatDate(row.day), row])
  );
  const workoutDailyTotals = new Map<string, DayAggregate>();

  for (const row of workoutRowsForDailyWindow) {
    const key = formatDate(row.day);
    const existing = workoutDailyTotals.get(key) ?? {
      workoutCount: 0,
      totalWorkoutDurationSeconds: 0
    };

    existing.workoutCount += 1;
    existing.totalWorkoutDurationSeconds += row.durationSeconds ?? 0;
    workoutDailyTotals.set(key, existing);
  }

  const daily = dailyDays.map((day) => {
    const activity = dailyActivityByDay.get(day);
    const appleHealthDay = appleHealthSnapshots?.days.get(day);
    const workoutTotals = workoutDailyTotals.get(day);

    return {
      day,
      steps: appleHealthDay ? appleHealthDay.steps : activity?.steps ?? null,
      activeCalories: appleHealthDay
        ? appleHealthDay.activeCalories
        : activity?.activeCalories ?? null,
      workoutCount: workoutTotals?.workoutCount ?? 0,
      totalWorkoutDurationSeconds: workoutTotals?.totalWorkoutDurationSeconds ?? 0
    };
  });

  const weeklyBuckets = buildWeekRange(latestDay, WEEKLY_WINDOW_WEEKS).map((bucket) => ({
    ...bucket,
    workoutCount: 0,
    activeCalories: null as number | null,
    steps: null as number | null,
    workoutTypes: new Map<string, { key: string; label: string; workoutCount: number }>(),
    trainingDays: 0,
    totalWorkoutDurationSeconds: 0
  }));
  const weeklyBucketMap = new Map(
    weeklyBuckets.map((bucket) => [bucket.weekStartDay, bucket])
  );
  const trainingDaysByWeek = new Map<string, Set<string>>();

  for (const row of workoutRowsForWeeklyWindow) {
    const weekStartDay = startOfWeek(formatDate(row.day));
    const bucket = weeklyBucketMap.get(weekStartDay);

    if (!bucket) {
      continue;
    }

    bucket.workoutCount += 1;
    bucket.totalWorkoutDurationSeconds += row.durationSeconds ?? 0;
    const normalized = normalizeActivityType(row.activityType);
    const workoutType = bucket.workoutTypes.get(normalized.key) ?? {
      key: normalized.key,
      label: normalized.label,
      workoutCount: 0
    };
    workoutType.workoutCount += 1;
    bucket.workoutTypes.set(normalized.key, workoutType);

    const trainingDays = trainingDaysByWeek.get(weekStartDay) ?? new Set<string>();
    trainingDays.add(formatDate(row.day));
    trainingDaysByWeek.set(weekStartDay, trainingDays);
  }

  const weekly = weeklyBuckets.map((bucket) => ({
    ...bucket,
    workoutTypes: Array.from(bucket.workoutTypes.values()).sort((left, right) => {
      if (right.workoutCount !== left.workoutCount) {
        return right.workoutCount - left.workoutCount;
      }

      return left.label.localeCompare(right.label);
    }),
    trainingDays: trainingDaysByWeek.get(bucket.weekStartDay)?.size ?? 0
  }));

  for (const bucket of weekly) {
    let activeCaloriesTotal = 0;
    let stepsTotal = 0;
    let hasActiveCalories = false;
    let hasSteps = false;

    for (
      let day = bucket.weekStartDay;
      day <= bucket.weekEndDay && day <= latestDay;
      day = addDays(day, 1)
    ) {
      const activity = dailyActivityByDay.get(day);
      const appleHealthDay = appleHealthSnapshots?.days.get(day);
      const steps = appleHealthDay ? appleHealthDay.steps : activity?.steps ?? null;
      const activeCalories = appleHealthDay
        ? appleHealthDay.activeCalories
        : activity?.activeCalories ?? null;

      if (steps !== null) {
        stepsTotal += steps;
        hasSteps = true;
      }

      if (activeCalories !== null) {
        activeCaloriesTotal += activeCalories;
        hasActiveCalories = true;
      }
    }

    bucket.steps = hasSteps ? stepsTotal : null;
    bucket.activeCalories = hasActiveCalories ? activeCaloriesTotal : null;
  }

  const breakdownMap = new Map<
    string,
    {
      key: string;
      label: string;
      totalCalories: number;
      totalDistanceMeters: number;
      totalDurationSeconds: number;
      workoutCount: number;
    }
  >();

  for (const row of workoutRowsForDailyWindow) {
    const normalized = normalizeActivityType(row.activityType);
    const existing = breakdownMap.get(normalized.key) ?? {
      key: normalized.key,
      label: normalized.label,
      workoutCount: 0,
      totalDurationSeconds: 0,
      totalDistanceMeters: 0,
      totalCalories: 0
    };

    existing.workoutCount += 1;
    existing.totalDurationSeconds += row.durationSeconds ?? 0;
    existing.totalDistanceMeters += row.distanceMeters ?? 0;
    existing.totalCalories += row.calories ?? 0;

    breakdownMap.set(normalized.key, existing);
  }

  const breakdown = Array.from(breakdownMap.values())
    .sort((left, right) => {
      if (right.workoutCount !== left.workoutCount) {
        return right.workoutCount - left.workoutCount;
      }

      return right.totalDurationSeconds - left.totalDurationSeconds;
    })
    .map((entry) => ({
      ...entry,
      totalDistanceMeters: entry.totalDistanceMeters || null,
      totalCalories: entry.totalCalories || null
    }));

  const thisWeekStartDay = addDays(latestDay, -(WEEKLY_SUMMARY_DAYS - 1));
  const workoutsThisWeek = daily
    .filter((entry) => entry.day >= thisWeekStartDay)
    .reduce((sum, entry) => sum + entry.workoutCount, 0);
  const trainingDays30d = daily.filter((entry) => entry.workoutCount > 0).length;
  const totalTrainingTime30d = daily.reduce(
    (sum, entry) => sum + entry.totalWorkoutDurationSeconds,
    0
  );
  const sevenDayEntries = daily.slice(-WEEKLY_SUMMARY_DAYS);

  return {
    generatedAt: new Date().toISOString(),
    latestDay,
    summary: {
      workoutsThisWeek,
      trainingDays30d,
      totalTrainingTime30d,
      averageSteps7d: averageOf(sevenDayEntries.map((entry) => entry.steps)),
      averageActiveCalories7d: averageOf(
        sevenDayEntries.map((entry) => entry.activeCalories)
      ),
      topActivityType: breakdown[0]
        ? {
            key: breakdown[0].key,
            label: breakdown[0].label,
            workoutCount: breakdown[0].workoutCount
          }
        : null
    },
    syncGuidance: {
      provider: "apple_health",
      configured: appleHealthStatus.configured,
      latestSyncAt: appleHealthStatus.latestSyncAt,
      latestSuccessfulSyncAt: appleHealthStatus.latestSuccessfulSyncAt,
      latestStatus: appleHealthStatus.latestStatus,
      lastErrorMessage: appleHealthStatus.lastErrorMessage
    },
    daily,
    weekly,
    breakdown,
    recentWorkouts: recentWorkoutRows.map((row) => {
      const normalized = normalizeActivityType(row.activityType);

      return {
        id: row.id,
        day: row.day.toISOString(),
        activityKey: normalized.key,
        activityLabel: normalized.label,
        activityType: row.activityType,
        source: row.source,
        sourceType: row.sourceType,
        intensity: row.intensity,
        label: row.label,
        startTime: row.startTime?.toISOString() ?? null,
        endTime: row.endTime?.toISOString() ?? null,
        durationSeconds: row.durationSeconds,
        calories: row.calories,
        distanceMeters: row.distanceMeters
      };
    }),
    totals: {
      hasDailyActivityData: daily.some(
        (entry) => entry.steps !== null || entry.activeCalories !== null
      ),
      hasWorkoutData: recentWorkoutRows.length > 0,
      totalDistance30d: sumOf(breakdown.map((entry) => entry.totalDistanceMeters)),
      totalCalories30d: sumOf(breakdown.map((entry) => entry.totalCalories))
    }
  };
}
