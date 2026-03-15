import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import {
  AnomalySeverity,
  PrismaClient,
  SyncMode,
  SyncSource,
  SyncStatus
} from "./generated/client/index.js";

type SeedDay = {
  day: string;
  totalSleepSeconds: number;
  timeInBedSeconds: number;
  averageHrv: number;
  restingHeartRate: number;
  temperatureDeviation: number;
  recoveryScore: number;
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

const demoUserEmail = "demo@wearable-analytics.local";

function asUtcDate(day: string) {
  return new Date(`${day}T00:00:00.000Z`);
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: demoUserEmail },
    update: {},
    create: {
      email: demoUserEmail,
      externalIdentifier: "demo-user"
    }
  });

  await prisma.anomalyFlag.deleteMany({ where: { userId: user.id } });
  await prisma.recoveryScore.deleteMany({ where: { userId: user.id } });
  await prisma.baselineSnapshot.deleteMany({ where: { userId: user.id } });
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

  console.log(`Seeded demo user ${demoUserEmail} with ${demoSeries.length} days of data.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
