import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadDotenv } from "dotenv";
import { Pool } from "pg";

import {
  AnomalySeverity,
  PrismaClient,
  SyncMode,
  SyncSource,
  SyncStatus
} from "./generated/client/index.js";

const envDir = dirname(fileURLToPath(import.meta.url));
const candidateEnvPaths = [
  resolve(process.cwd(), ".env"),
  resolve(envDir, "../.env")
];

for (const envPath of candidateEnvPaths) {
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath });
    break;
  }
}

type SeedDay = {
  day: string;
  totalSleepSeconds: number;
  timeInBedSeconds: number;
  averageHrv: number;
  restingHeartRate: number;
  temperatureDeviation: number;
  recoveryScore: number;
};

type SeedWorkout = {
  activityType: string;
  calories: number;
  day: string;
  distanceMeters: number | null;
  durationSeconds: number;
  externalId: string;
  intensity: string;
  sourceType: string;
  startTime: string;
};

const prisma = new PrismaClient({
  adapter: new PrismaPg(
    new Pool({
      connectionString: process.env.DATABASE_URL
    })
  )
});

const demoSeries: SeedDay[] = [
  {
    day: "2026-03-01",
    totalSleepSeconds: 27000,
    timeInBedSeconds: 28800,
    averageHrv: 52,
    restingHeartRate: 51,
    temperatureDeviation: -0.1,
    recoveryScore: 83
  },
  {
    day: "2026-03-02",
    totalSleepSeconds: 25800,
    timeInBedSeconds: 28200,
    averageHrv: 49,
    restingHeartRate: 52,
    temperatureDeviation: 0.0,
    recoveryScore: 79
  },
  {
    day: "2026-03-03",
    totalSleepSeconds: 24600,
    timeInBedSeconds: 27600,
    averageHrv: 44,
    restingHeartRate: 55,
    temperatureDeviation: 0.2,
    recoveryScore: 68
  }
];

const demoWorkouts: SeedWorkout[] = [
  {
    externalId: "seed-run-2026-03-01",
    day: "2026-03-01",
    startTime: "2026-03-01T12:10:00.000Z",
    durationSeconds: 2460,
    activityType: "running",
    calories: 438,
    distanceMeters: 6150,
    intensity: "moderate",
    sourceType: "apple_health"
  },
  {
    externalId: "seed-row-2026-03-02",
    day: "2026-03-02",
    startTime: "2026-03-02T23:40:00.000Z",
    durationSeconds: 1680,
    activityType: "rowing",
    calories: 312,
    distanceMeters: null,
    intensity: "hard",
    sourceType: "manual"
  },
  {
    externalId: "seed-kayak-2026-03-03",
    day: "2026-03-03",
    startTime: "2026-03-03T17:30:00.000Z",
    durationSeconds: 3540,
    activityType: "kayaking",
    calories: 524,
    distanceMeters: 8420,
    intensity: "moderate",
    sourceType: "apple_health"
  }
];

const primaryUserEmail = "local-user@wearable-analytics.local";
const primaryExternalId = "local-primary-user";
const legacyDemoUserEmail = "demo@wearable-analytics.local";
const legacyDemoExternalId = "demo-user";

function asUtcDate(day: string) {
  return new Date(`${day}T00:00:00.000Z`);
}

async function main() {
  const existingPrimaryUser = await prisma.user.findFirst({
    where: {
      OR: [
        { externalIdentifier: primaryExternalId },
        { email: primaryUserEmail }
      ]
    }
  });

  const user = existingPrimaryUser
    ? await prisma.user.update({
        where: { id: existingPrimaryUser.id },
        data: {
          email: primaryUserEmail,
          externalIdentifier: primaryExternalId
        }
      })
    : await prisma.user.create({
        data: {
          email: primaryUserEmail,
          externalIdentifier: primaryExternalId
        }
      });

  const legacyDemoUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: legacyDemoUserEmail },
        { externalIdentifier: legacyDemoExternalId }
      ]
    }
  });

  if (legacyDemoUser && legacyDemoUser.id !== user.id) {
    await prisma.anomalyFlag.deleteMany({ where: { userId: legacyDemoUser.id } });
    await prisma.recoveryScore.deleteMany({ where: { userId: legacyDemoUser.id } });
    await prisma.baselineSnapshot.deleteMany({ where: { userId: legacyDemoUser.id } });
    await prisma.appleHealthRecord.deleteMany({ where: { userId: legacyDemoUser.id } });
    await prisma.appleHealthSyncBatch.deleteMany({ where: { userId: legacyDemoUser.id } });
    await prisma.workoutSession.deleteMany({ where: { userId: legacyDemoUser.id } });
    await prisma.dailyActivity.deleteMany({ where: { userId: legacyDemoUser.id } });
    await prisma.dailyRecoveryInput.deleteMany({ where: { userId: legacyDemoUser.id } });
    await prisma.dailySleep.deleteMany({ where: { userId: legacyDemoUser.id } });
    await prisma.syncRun.deleteMany({ where: { userId: legacyDemoUser.id } });
    await prisma.user.delete({ where: { id: legacyDemoUser.id } });
  }

  await prisma.anomalyFlag.deleteMany({ where: { userId: user.id } });
  await prisma.recoveryScore.deleteMany({ where: { userId: user.id } });
  await prisma.baselineSnapshot.deleteMany({ where: { userId: user.id } });
  await prisma.appleHealthRecord.deleteMany({ where: { userId: user.id } });
  await prisma.appleHealthSyncBatch.deleteMany({ where: { userId: user.id } });
  await prisma.workoutSession.deleteMany({ where: { userId: user.id } });
  await prisma.dailyActivity.deleteMany({ where: { userId: user.id } });
  await prisma.dailyRecoveryInput.deleteMany({ where: { userId: user.id } });
  await prisma.dailySleep.deleteMany({ where: { userId: user.id } });
  await prisma.syncRun.deleteMany({ where: { userId: user.id } });

  await prisma.syncRun.create({
    data: {
      userId: user.id,
      source: SyncSource.oura,
      mode: SyncMode.manual,
      status: SyncStatus.succeeded,
      startedAt: new Date(),
      finishedAt: new Date()
    }
  });

  for (const entry of demoSeries) {
    const day = asUtcDate(entry.day);

    await prisma.dailySleep.upsert({
      where: {
        userId_day: {
          userId: user.id,
          day
        }
      },
      update: {
        totalSleepSeconds: entry.totalSleepSeconds,
        timeInBedSeconds: entry.timeInBedSeconds,
        sleepEfficiency: Number(
          (entry.totalSleepSeconds / entry.timeInBedSeconds).toFixed(2)
        ),
        sleepLatencySeconds: 720,
        averageHr: entry.restingHeartRate + 6,
        lowestHr: entry.restingHeartRate - 3,
        averageHrv: entry.averageHrv,
        bedtimeStart: new Date(`${entry.day}T05:45:00.000Z`),
        bedtimeEnd: new Date(`${entry.day}T13:15:00.000Z`)
      },
      create: {
        userId: user.id,
        day,
        totalSleepSeconds: entry.totalSleepSeconds,
        timeInBedSeconds: entry.timeInBedSeconds,
        sleepEfficiency: Number(
          (entry.totalSleepSeconds / entry.timeInBedSeconds).toFixed(2)
        ),
        sleepLatencySeconds: 720,
        averageHr: entry.restingHeartRate + 6,
        lowestHr: entry.restingHeartRate - 3,
        averageHrv: entry.averageHrv,
        bedtimeStart: new Date(`${entry.day}T05:45:00.000Z`),
        bedtimeEnd: new Date(`${entry.day}T13:15:00.000Z`)
      }
    });

    await prisma.dailyRecoveryInput.upsert({
      where: {
        userId_day: {
          userId: user.id,
          day
        }
      },
      update: {
        restingHeartRate: entry.restingHeartRate,
        hrv: entry.averageHrv,
        temperatureDeviation: entry.temperatureDeviation,
        readinessEquivalent: entry.recoveryScore,
        activityBalance: 0.1
      },
      create: {
        userId: user.id,
        day,
        restingHeartRate: entry.restingHeartRate,
        hrv: entry.averageHrv,
        temperatureDeviation: entry.temperatureDeviation,
        readinessEquivalent: entry.recoveryScore,
        activityBalance: 0.1
      }
    });

    await prisma.dailyActivity.upsert({
      where: {
        userId_day: {
          userId: user.id,
          day
        }
      },
      update: {
        activeCalories: 540,
        totalCalories: 2240,
        steps: 9320,
        equivalentWalkingDistance: 6.8
      },
      create: {
        userId: user.id,
        day,
        activeCalories: 540,
        totalCalories: 2240,
        steps: 9320,
        equivalentWalkingDistance: 6.8
      }
    });

    await prisma.baselineSnapshot.upsert({
      where: {
        userId_day: {
          userId: user.id,
          day
        }
      },
      update: {
        hrvBaseline: 48,
        restingHrBaseline: 53,
        temperatureBaseline: 0,
        sleepDurationBaseline: 26100
      },
      create: {
        userId: user.id,
        day,
        hrvBaseline: 48,
        restingHrBaseline: 53,
        temperatureBaseline: 0,
        sleepDurationBaseline: 26100
      }
    });

    await prisma.recoveryScore.upsert({
      where: {
        userId_day: {
          userId: user.id,
          day
        }
      },
      update: {
        score: entry.recoveryScore,
        confidence: 0.82,
        hrvContribution: 0.35,
        restingHrContribution: 0.28,
        temperatureContribution: 0.15,
        sleepContribution: 0.22,
        explanationSummary:
          "Recovery is supported by stable sleep and resting heart rate, with minor temperature variance."
      },
      create: {
        userId: user.id,
        day,
        score: entry.recoveryScore,
        confidence: 0.82,
        hrvContribution: 0.35,
        restingHrContribution: 0.28,
        temperatureContribution: 0.15,
        sleepContribution: 0.22,
        explanationSummary:
          "Recovery is supported by stable sleep and resting heart rate, with minor temperature variance."
      }
    });

    if (entry.recoveryScore < 70) {
      await prisma.anomalyFlag.create({
        data: {
          userId: user.id,
          day,
          type: "recovery_drop",
          severity: AnomalySeverity.medium,
          title: "Recovery dipped below baseline",
          description:
            "HRV softened while resting heart rate and temperature drifted upward."
        }
      });
    }
  }

  const appleHealthBatch = await prisma.appleHealthSyncBatch.create({
    data: {
      userId: user.id,
      source: SyncSource.apple_health,
      status: SyncStatus.succeeded,
      clientSyncedThrough: new Date("2026-03-04T08:00:00.000Z"),
      deviceName: "Mauricio's iPhone",
      deviceModel: "iPhone",
      deviceSystemVersion: "17.5",
      appVersion: "0.1.0",
      bundleIdentifier: "com.baseline.HealthBridge",
      receivedRecordCount: demoSeries.length * 2 + demoWorkouts.length,
      storedRecordCount: demoSeries.length * 2 + demoWorkouts.length,
      upsertedRecordCount: 0,
      payload: {
        demo: true
      },
      processedAt: new Date("2026-03-04T08:00:03.000Z")
    }
  });

  for (const entry of demoSeries) {
    await prisma.appleHealthRecord.createMany({
      data: [
        {
          userId: user.id,
          syncBatchId: appleHealthBatch.id,
          source: SyncSource.apple_health,
          recordType: "step_count",
          externalId: `steps-${entry.day}`,
          fallbackKey: `steps-${entry.day}`,
          ingestKey: `step_count:steps-${entry.day}`,
          unit: "count",
          startTime: new Date(`${entry.day}T00:00:00.000Z`),
          endTime: new Date(`${entry.day}T23:59:59.000Z`),
          day: asUtcDate(entry.day),
          numericValue: 9200,
          rawPayload: {
            value: 9200
          }
        },
        {
          userId: user.id,
          syncBatchId: appleHealthBatch.id,
          source: SyncSource.apple_health,
          recordType: "active_energy_burned",
          externalId: `energy-${entry.day}`,
          fallbackKey: `energy-${entry.day}`,
          ingestKey: `active_energy_burned:energy-${entry.day}`,
          unit: "kcal",
          startTime: new Date(`${entry.day}T00:00:00.000Z`),
          endTime: new Date(`${entry.day}T23:59:59.000Z`),
          day: asUtcDate(entry.day),
          numericValue: 560,
          rawPayload: {
            value: 560
          }
        }
      ]
    });
  }

  for (const workout of demoWorkouts) {
    const startTime = new Date(workout.startTime);

    await prisma.appleHealthRecord.create({
      data: {
        userId: user.id,
        syncBatchId: appleHealthBatch.id,
        source: SyncSource.apple_health,
        recordType: "workout",
        externalId: workout.externalId,
        fallbackKey: workout.externalId,
        ingestKey: `workout:${workout.externalId}`,
        unit: "kcal",
        startTime,
        endTime: new Date(startTime.getTime() + workout.durationSeconds * 1000),
        day: asUtcDate(workout.day),
        numericValue: workout.calories,
        metadata: {
          activityType: workout.activityType,
          totalDistanceMeters: workout.distanceMeters
        },
        rawPayload: {
          activityType: workout.activityType,
          calories: workout.calories
        }
      }
    });

    await prisma.workoutSession.create({
      data: {
        userId: user.id,
        source: SyncSource.apple_health,
        externalId: workout.externalId,
        day: asUtcDate(workout.day),
        activityType: workout.activityType,
        sourceType: workout.sourceType,
        intensity: workout.intensity,
        startTime,
        endTime: new Date(startTime.getTime() + workout.durationSeconds * 1000),
        durationSeconds: workout.durationSeconds,
        calories: workout.calories,
        distanceMeters: workout.distanceMeters
      }
    });
  }

  console.log(
    `Seeded demo data for ${primaryUserEmail} with ${demoSeries.length} days and ${demoWorkouts.length} workouts.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
