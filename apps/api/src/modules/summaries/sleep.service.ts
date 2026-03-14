import { prisma } from "../../lib/prisma.js";
import { getOrCreatePrimaryUser } from "../auth/single-user.service.js";
import { computeBaselineSnapshot } from "../analytics/baseline.service.js";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
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

  const latestSleep = await prisma.dailySleep.findFirst({
    where: {
      userId: user.id
    },
    orderBy: {
      day: "desc"
    }
  });

  if (!latestSleep) {
    return null;
  }

  const baseline = await computeBaselineSnapshot(formatDate(latestSleep.day));
  const durationDeltaSeconds =
    baseline.sleepDurationBaseline === null
      ? null
      : latestSleep.totalSleepSeconds - baseline.sleepDurationBaseline;

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
    note: buildSleepNote({
      durationDeltaSeconds,
      sleepEfficiency: latestSleep.sleepEfficiency,
      sleepLatencySeconds: latestSleep.sleepLatencySeconds
    })
  };
}
