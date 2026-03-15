import { SyncMode, SyncSource, SyncStatus } from "../../lib/prisma-client.js";

import { prisma } from "../../lib/prisma.js";
import { getOrCreatePrimaryUser } from "../auth/single-user.service.js";
import {
  OuraApiClient,
  type OuraDailyActivityItem,
  type OuraDailyReadinessItem,
  type OuraSleepItem
} from "../oura/oura-client.js";
import { resolveSyncWindowFromState } from "./sync-window.js";

const MAX_HISTORY_ITEMS = 20;

type SyncWindowInput = {
  endDate?: string;
  lookbackDays?: number;
  startDate?: string;
};

type SyncWindow = {
  endDate: string;
  startDate: string;
};

type SyncSummary = {
  activityRecords: number;
  readinessRecords: number;
  sleepRecords: number;
};

type RunOuraSyncOptions = {
  mode: SyncMode;
  windowInput?: SyncWindowInput;
};

function asUtcDate(day: string) {
  return new Date(`${day}T00:00:00.000Z`);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function truncateErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown sync error";

  return message.slice(0, 500);
}

function selectPrimarySleepByDay(items: OuraSleepItem[]) {
  const byDay = new Map<string, OuraSleepItem>();

  for (const item of items) {
    const existing = byDay.get(item.day);
    const itemDuration = item.total_sleep_duration ?? 0;
    const existingDuration = existing?.total_sleep_duration ?? 0;

    if (!existing || itemDuration > existingDuration) {
      byDay.set(item.day, item);
    }
  }

  return byDay;
}

async function getLatestSyncedDayForUser(userId: string) {
  const [latestSleep, latestReadiness, latestActivity] = await Promise.all([
    prisma.dailySleep.findFirst({
      where: { userId },
      orderBy: { day: "desc" },
      select: { day: true }
    }),
    prisma.dailyRecoveryInput.findFirst({
      where: { userId },
      orderBy: { day: "desc" },
      select: { day: true }
    }),
    prisma.dailyActivity.findFirst({
      where: { userId },
      orderBy: { day: "desc" },
      select: { day: true }
    })
  ]);

  const latest = [latestSleep?.day, latestReadiness?.day, latestActivity?.day]
    .filter((day): day is Date => Boolean(day))
    .sort((left, right) => right.getTime() - left.getTime())[0];

  return latest ? formatDate(latest) : null;
}

async function resolveSyncWindow(userId: string, input: SyncWindowInput): Promise<SyncWindow> {
  const today = formatDate(new Date());
  const latestSyncedDay = await getLatestSyncedDayForUser(userId);

  return resolveSyncWindowFromState({
    ...input,
    today,
    latestSyncedDay
  });
}

async function persistSleepRecords(userId: string, items: OuraSleepItem[]) {
  const primarySleepByDay = selectPrimarySleepByDay(items);

  await Promise.all(
    Array.from(primarySleepByDay.values()).map((item) =>
      prisma.dailySleep.upsert({
        where: {
          userId_day: {
            userId,
            day: asUtcDate(item.day)
          }
        },
        update: {
          totalSleepSeconds: item.total_sleep_duration ?? 0,
          timeInBedSeconds: item.time_in_bed ?? 0,
          sleepEfficiency: item.efficiency ?? null,
          sleepLatencySeconds: item.latency ?? null,
          averageHr: item.average_heart_rate ?? null,
          lowestHr: item.lowest_heart_rate ?? null,
          averageHrv: item.average_hrv ?? null,
          bedtimeStart: item.bedtime_start ? new Date(item.bedtime_start) : null,
          bedtimeEnd: item.bedtime_end ? new Date(item.bedtime_end) : null
        },
        create: {
          userId,
          day: asUtcDate(item.day),
          totalSleepSeconds: item.total_sleep_duration ?? 0,
          timeInBedSeconds: item.time_in_bed ?? 0,
          sleepEfficiency: item.efficiency ?? null,
          sleepLatencySeconds: item.latency ?? null,
          averageHr: item.average_heart_rate ?? null,
          lowestHr: item.lowest_heart_rate ?? null,
          averageHrv: item.average_hrv ?? null,
          bedtimeStart: item.bedtime_start ? new Date(item.bedtime_start) : null,
          bedtimeEnd: item.bedtime_end ? new Date(item.bedtime_end) : null
        }
      })
    )
  );

  return primarySleepByDay;
}

async function persistReadinessRecords(
  userId: string,
  items: OuraDailyReadinessItem[],
  primarySleepByDay: Map<string, OuraSleepItem>
) {
  await Promise.all(
    items.map((item) => {
      const sleep = primarySleepByDay.get(item.day);

      return prisma.dailyRecoveryInput.upsert({
        where: {
          userId_day: {
            userId,
            day: asUtcDate(item.day)
          }
        },
        update: {
          restingHeartRate: sleep?.lowest_heart_rate ?? null,
          hrv: sleep?.average_hrv ?? null,
          temperatureDeviation: item.temperature_deviation ?? null,
          readinessEquivalent: item.score ?? null,
          activityBalance: item.contributors.activity_balance ?? null
        },
        create: {
          userId,
          day: asUtcDate(item.day),
          restingHeartRate: sleep?.lowest_heart_rate ?? null,
          hrv: sleep?.average_hrv ?? null,
          temperatureDeviation: item.temperature_deviation ?? null,
          readinessEquivalent: item.score ?? null,
          activityBalance: item.contributors.activity_balance ?? null
        }
      });
    })
  );
}

async function persistActivityRecords(userId: string, items: OuraDailyActivityItem[]) {
  await Promise.all(
    items.map((item) =>
      prisma.dailyActivity.upsert({
        where: {
          userId_day: {
            userId,
            day: asUtcDate(item.day)
          }
        },
        update: {
          activeCalories: item.active_calories ?? null,
          totalCalories: item.total_calories ?? null,
          steps: item.steps ?? null,
          equivalentWalkingDistance: item.equivalent_walking_distance ?? null
        },
        create: {
          userId,
          day: asUtcDate(item.day),
          activeCalories: item.active_calories ?? null,
          totalCalories: item.total_calories ?? null,
          steps: item.steps ?? null,
          equivalentWalkingDistance: item.equivalent_walking_distance ?? null
        }
      })
    )
  );
}

async function createRunningSyncRun(userId: string, mode: SyncMode, window: SyncWindow) {
  const existingRunningSync = await prisma.syncRun.findFirst({
    where: {
      userId,
      source: SyncSource.oura,
      status: SyncStatus.running
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (existingRunningSync) {
    throw new Error("An Oura sync is already running.");
  }

  return prisma.syncRun.create({
    data: {
      userId,
      source: SyncSource.oura,
      mode,
      status: SyncStatus.running,
      rangeStart: asUtcDate(window.startDate),
      rangeEnd: asUtcDate(window.endDate),
      startedAt: new Date()
    }
  });
}

async function runOuraSync(options: RunOuraSyncOptions) {
  const user = await getOrCreatePrimaryUser();
  const syncWindow = await resolveSyncWindow(user.id, options.windowInput ?? {});
  const syncRun = await createRunningSyncRun(user.id, options.mode, syncWindow);
  const client = new OuraApiClient();

  try {
    const [sleepItems, readinessItems, activityItems] = await Promise.all([
      client.fetchSleep(syncWindow.startDate, syncWindow.endDate),
      client.fetchDailyReadiness(syncWindow.startDate, syncWindow.endDate),
      client.fetchDailyActivity(syncWindow.startDate, syncWindow.endDate)
    ]);

    const primarySleepByDay = await persistSleepRecords(user.id, sleepItems);

    await Promise.all([
      persistReadinessRecords(user.id, readinessItems, primarySleepByDay),
      persistActivityRecords(user.id, activityItems)
    ]);

    const summary: SyncSummary = {
      sleepRecords: primarySleepByDay.size,
      readinessRecords: readinessItems.length,
      activityRecords: activityItems.length
    };

    const completedRun = await prisma.syncRun.update({
      where: {
        id: syncRun.id
      },
      data: {
        status: SyncStatus.succeeded,
        finishedAt: new Date()
      }
    });

    return {
      syncRun: completedRun,
      summary,
      window: syncWindow
    };
  } catch (error) {
    const failedRun = await prisma.syncRun.update({
      where: {
        id: syncRun.id
      },
      data: {
        status: SyncStatus.failed,
        finishedAt: new Date(),
        errorMessage: truncateErrorMessage(error)
      }
    });

    throw Object.assign(error instanceof Error ? error : new Error("Sync failed"), {
      syncRun: failedRun
    });
  }
}

export async function runManualOuraSync(input: SyncWindowInput = {}) {
  return runOuraSync({
    mode: SyncMode.manual,
    windowInput: input
  });
}

export async function runBackfillOuraSync(input: {
  endDate: string;
  startDate: string;
}) {
  return runOuraSync({
    mode: SyncMode.backfill,
    windowInput: input
  });
}

export async function runScheduledOuraSync() {
  return runOuraSync({
    mode: SyncMode.scheduled
  });
}

export async function getOuraSyncStatus() {
  const user = await getOrCreatePrimaryUser();

  const [runningSync, latestSync] = await Promise.all([
    prisma.syncRun.findFirst({
      where: {
        userId: user.id,
        source: SyncSource.oura,
        status: SyncStatus.running
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.syncRun.findFirst({
      where: {
        userId: user.id,
        source: SyncSource.oura
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  ]);

  return {
    provider: "oura" as const,
    running: Boolean(runningSync),
    currentRun: runningSync,
    latestRun: latestSync
  };
}

export async function getOuraSyncHistory() {
  const user = await getOrCreatePrimaryUser();

  const runs = await prisma.syncRun.findMany({
    where: {
      userId: user.id,
      source: SyncSource.oura
    },
    orderBy: {
      createdAt: "desc"
    },
    take: MAX_HISTORY_ITEMS
  });

  return {
    provider: "oura" as const,
    runs
  };
}
