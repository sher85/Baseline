import { prisma } from "../../lib/prisma.js";
import { getOrCreatePrimaryUser } from "../auth/single-user.service.js";
import { computeBaselineSnapshot } from "../analytics/baseline.service.js";

type BedtimeConsistencyEntry = {
  bedtimeStart: string;
  clockMinutes: number;
  day: string;
};

type BedtimeConsistencyStatus = "mixed" | "steady" | "variable" | "warming_up";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getLocalClockMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function wrapClockMinutes(minutes: number) {
  return ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
}

function normalizeBedtimeMinutes(clockMinutes: number) {
  return clockMinutes < 12 * 60 ? clockMinutes + 24 * 60 : clockMinutes;
}

export function computeBedtimeConsistency(entries: BedtimeConsistencyEntry[]) {
  if (entries.length === 0) {
    return null;
  }

  const chronologicalEntries = [...entries].sort((left, right) => left.day.localeCompare(right.day));
  const normalizedEntries = chronologicalEntries.map((entry) => ({
    ...entry,
    normalizedClockMinutes: normalizeBedtimeMinutes(entry.clockMinutes)
  }));

  const averageNormalizedMinutes =
    normalizedEntries.reduce((total, entry) => total + entry.normalizedClockMinutes, 0) /
    normalizedEntries.length;

  const recent = normalizedEntries.map((entry) => ({
    day: entry.day,
    bedtimeStart: entry.bedtimeStart,
    clockMinutes: entry.clockMinutes,
    offsetMinutes: Math.round(entry.normalizedClockMinutes - averageNormalizedMinutes)
  }));

  const averageDeviationMinutes = Math.round(
    recent.reduce((total, entry) => total + Math.abs(entry.offsetMinutes), 0) / recent.length
  );

  let status: BedtimeConsistencyStatus = "variable";

  if (recent.length < 3) {
    status = "warming_up";
  } else if (averageDeviationMinutes <= 25) {
    status = "steady";
  } else if (averageDeviationMinutes <= 50) {
    status = "mixed";
  }

  return {
    averageClockMinutes: Math.round(wrapClockMinutes(averageNormalizedMinutes)),
    averageDeviationMinutes,
    latestOffsetMinutes: recent.at(-1)?.offsetMinutes ?? 0,
    recent,
    status
  };
}

function buildSleepNote(input: {
  durationDeltaSeconds: number | null;
  sleepEfficiency: number | null;
  sleepLatencySeconds: number | null;
}) {
  if (input.durationDeltaSeconds !== null) {
    if (input.durationDeltaSeconds <= -(90 * 60)) {
      return "Sleep duration landed materially below your recent baseline.";
    }

    if (input.durationDeltaSeconds >= 45 * 60) {
      return "Sleep duration came in above baseline, which should support recovery.";
    }
  }

  if (input.sleepEfficiency !== null && input.sleepEfficiency >= 90) {
    return "Sleep efficiency was strong, suggesting solid sleep continuity.";
  }

  if (input.sleepLatencySeconds !== null && input.sleepLatencySeconds >= 20 * 60) {
    return "Sleep onset took longer than usual, which is worth watching.";
  }

  return "Sleep stayed near your recent pattern without a major deviation.";
}

export async function getLatestSleepSummary() {
  const user = await getOrCreatePrimaryUser();

  const [latestSleep, recentSleepWithBedtimes] = await Promise.all([
    prisma.dailySleep.findFirst({
      where: {
        userId: user.id
      },
      orderBy: {
        day: "desc"
      }
    }),
    prisma.dailySleep.findMany({
      where: {
        userId: user.id,
        bedtimeStart: {
          not: null
        }
      },
      orderBy: {
        day: "desc"
      },
      take: 7,
      select: {
        day: true,
        bedtimeStart: true
      }
    })
  ]);

  if (!latestSleep) {
    return null;
  }

  const baseline = await computeBaselineSnapshot(formatDate(latestSleep.day));
  const durationDeltaSeconds =
    baseline.sleepDurationBaseline === null
      ? null
      : latestSleep.totalSleepSeconds - baseline.sleepDurationBaseline;
  const bedtimeConsistency = computeBedtimeConsistency(
    recentSleepWithBedtimes
      .filter(
        (sleep): sleep is { bedtimeStart: Date; day: Date } => Boolean(sleep.bedtimeStart)
      )
      .map((sleep) => ({
        day: sleep.day.toISOString(),
        bedtimeStart: sleep.bedtimeStart.toISOString(),
        clockMinutes: getLocalClockMinutes(sleep.bedtimeStart)
      }))
  );

  return {
    day: latestSleep.day.toISOString(),
    totals: {
      sleepSeconds: latestSleep.totalSleepSeconds,
      timeInBedSeconds: latestSleep.timeInBedSeconds,
      efficiency: latestSleep.sleepEfficiency,
      latencySeconds: latestSleep.sleepLatencySeconds
    },
    vitals: {
      averageHr: latestSleep.averageHr,
      lowestHr: latestSleep.lowestHr,
      averageHrv: latestSleep.averageHrv
    },
    timing: {
      bedtimeStart: latestSleep.bedtimeStart?.toISOString() ?? null,
      bedtimeEnd: latestSleep.bedtimeEnd?.toISOString() ?? null
    },
    baseline: {
      sleepDurationSeconds: baseline.sleepDurationBaseline,
      durationDeltaSeconds
    },
    consistency: bedtimeConsistency,
    note: buildSleepNote({
      durationDeltaSeconds,
      sleepEfficiency: latestSleep.sleepEfficiency,
      sleepLatencySeconds: latestSleep.sleepLatencySeconds
    })
  };
}
