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

type StoredAnomalyFlag = {
  createdAt: Date;
  day: Date;
  description: string;
  severity: AnomalySeverity;
  title: string;
  type: string;
};

export const anomalyCategoryOptions = [
  { value: "all", label: "All anomalies" },
  { value: "sleep", label: "Sleep" },
  { value: "hrv", label: "HRV" },
  { value: "resting_hr", label: "Resting heart rate" },
  { value: "temperature", label: "Temperature" }
] as const;

export type AnomalyCategory = (typeof anomalyCategoryOptions)[number]["value"];
export type AnomalyRange = "3m" | "6m" | "12m";

function severityRank(severity: AnomalySeverity) {
  return severity === AnomalySeverity.high ? 3 : severity === AnomalySeverity.medium ? 2 : 1;
}

function severityWeight(severity: AnomalySeverity) {
  return severity === AnomalySeverity.high ? 3 : severity === AnomalySeverity.medium ? 2 : 1;
}

function formatCategoryLabel(value: AnomalyCategory) {
  return anomalyCategoryOptions.find((option) => option.value === value)?.label ?? "All anomalies";
}

function getAnomalyCategory(type: string): Exclude<AnomalyCategory, "all"> {
  if (type === "short_sleep") {
    return "sleep";
  }

  if (type === "low_hrv") {
    return "hrv";
  }

  if (type === "elevated_resting_hr") {
    return "resting_hr";
  }

  return "temperature";
}

function flagMatchesCategory(flag: { type: string }, category: AnomalyCategory) {
  return category === "all" ? true : getAnomalyCategory(flag.type) === category;
}

function startDateForRange(endDay: Date, range: AnomalyRange) {
  const startDay = new Date(endDay);

  startDay.setUTCHours(0, 0, 0, 0);
  startDay.setUTCDate(1);

  if (range === "3m") {
    startDay.setUTCMonth(startDay.getUTCMonth() - 2);
  } else if (range === "6m") {
    startDay.setUTCMonth(startDay.getUTCMonth() - 5);
  } else {
    startDay.setUTCMonth(startDay.getUTCMonth() - 11);
  }

  return startDay;
}

function enumerateDays(startDay: Date, endDay: Date) {
  const days: string[] = [];
  const cursor = new Date(startDay);

  while (cursor <= endDay) {
    days.push(formatDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

function dedupeFlags(flags: StoredAnomalyFlag[]) {
  const bySignature = new Map<string, StoredAnomalyFlag>();

  for (const flag of flags) {
    const signature = [formatDate(flag.day), flag.type, flag.severity, flag.title, flag.description].join("|");
    const existing = bySignature.get(signature);

    if (!existing || existing.createdAt > flag.createdAt) {
      bySignature.set(signature, flag);
    }
  }

  return Array.from(bySignature.values());
}

function groupFlagsByDay(flags: StoredAnomalyFlag[]) {
  const grouped = new Map<
    string,
    Array<{
      description: string;
      severity: AnomalySeverity;
      title: string;
      type: string;
    }>
  >();

  for (const flag of dedupeFlags(flags)) {
    const day = formatDate(flag.day);
    const dayFlags = grouped.get(day) ?? [];
    dayFlags.push({
      type: flag.type,
      title: flag.title,
      description: flag.description,
      severity: flag.severity
    });
    grouped.set(day, dayFlags);
  }

  return Array.from(grouped.entries()).map(([day, anomalies]) => {
    anomalies.sort((left, right) => severityRank(right.severity) - severityRank(left.severity));

    const highestSeverity = anomalies.reduce<AnomalySeverity>(
      (current, anomaly) =>
        severityRank(anomaly.severity) > severityRank(current) ? anomaly.severity : current,
      AnomalySeverity.low
    );

    const severityCounts = anomalies.reduce(
      (counts, anomaly) => {
        counts[anomaly.severity] += 1;
        return counts;
      },
      { high: 0, medium: 0, low: 0 }
    );

    return {
      day,
      anomalies,
      highestSeverity,
      severityCounts
    };
  });
}

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

  const flags = await prisma.anomalyFlag.findMany({
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

  return dedupeFlags(flags);
}

export async function getAnomalyHistoryPage(limitDays = 10, cursorDay?: string, targetDay?: string) {
  const user = await getOrCreatePrimaryUser();
  const take = Math.min(Math.max(Math.trunc(limitDays), 1), 366);

  const dayRows = await prisma.anomalyFlag.groupBy({
    by: ["day"],
    where: {
      userId: user.id,
      ...(cursorDay
        ? {
            day: {
              lt: new Date(`${cursorDay}T00:00:00.000Z`)
            }
          }
        : {})
    },
    orderBy: {
      day: "desc"
    },
    take: 367
  });

  let selectedCount = Math.min(take, dayRows.length);

  if (targetDay) {
    const targetIndex = dayRows.findIndex((row) => formatDate(row.day) === targetDay);

    if (targetIndex >= 0) {
      selectedCount = Math.max(selectedCount, targetIndex + 1);
    }
  }

  const hasMore = dayRows.length > selectedCount;
  const selectedDays = dayRows.slice(0, selectedCount).map((row) => row.day);

  if (selectedDays.length === 0) {
    return {
      items: [],
      hasMore: false,
      nextCursorDay: null
    };
  }

  const flags = await prisma.anomalyFlag.findMany({
    where: {
      userId: user.id,
      day: {
        in: selectedDays
      }
    },
    orderBy: [
      { day: "desc" },
      { severity: "desc" },
      { createdAt: "asc" }
    ],
    select: {
      createdAt: true,
      day: true,
      description: true,
      severity: true,
      title: true,
      type: true
    }
  });

  const items = groupFlagsByDay(flags).sort((left, right) => right.day.localeCompare(left.day));
  const nextCursorRow = hasMore ? dayRows[selectedCount] : undefined;

  return {
    items,
    hasMore,
    nextCursorDay: nextCursorRow ? formatDate(nextCursorRow.day) : null
  };
}

export async function getAnomalyHeatmap(
  range: AnomalyRange,
  category: AnomalyCategory = "all"
) {
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
    return {
      categories: anomalyCategoryOptions,
      days: [],
      filter: {
        category,
        categoryLabel: formatCategoryLabel(category),
        range
      },
      range: {
        endDay: null,
        startDay: null
      }
    };
  }

  const endDay = new Date(latestRecoveryDay.day);
  endDay.setUTCHours(0, 0, 0, 0);
  const startDay = startDateForRange(endDay, range);

  const recoveryDays = await prisma.dailyRecoveryInput.findMany({
    where: {
      userId: user.id,
      day: {
        gte: startDay,
        lte: endDay
      }
    },
    select: {
      day: true
    },
    orderBy: {
      day: "asc"
    }
  });

  await Promise.all(recoveryDays.map((row) => computeAnomaliesForDay(formatDate(row.day))));

  const flags = dedupeFlags(
    await prisma.anomalyFlag.findMany({
      where: {
        userId: user.id,
        day: {
          gte: startDay,
          lte: endDay
        }
      },
      orderBy: [
        { day: "asc" },
        { severity: "desc" },
        { createdAt: "asc" }
      ],
      select: {
        createdAt: true,
        day: true,
        description: true,
        severity: true,
        title: true,
        type: true
      }
    })
  );

  const filteredFlags = flags.filter((flag) => flagMatchesCategory(flag, category));
  const flagsByDay = new Map<string, StoredAnomalyFlag[]>();

  for (const flag of filteredFlags) {
    const day = formatDate(flag.day);
    const dayFlags = flagsByDay.get(day) ?? [];
    dayFlags.push(flag);
    flagsByDay.set(day, dayFlags);
  }

  const days = enumerateDays(startDay, endDay).map((day) => {
    const dayFlags = flagsByDay.get(day) ?? [];
    const severityBreakdown = dayFlags.reduce(
      (counts, flag) => {
        counts[flag.severity] += 1;
        return counts;
      },
      { high: 0, medium: 0, low: 0 }
    );

    return {
      date: day,
      score: dayFlags.reduce((total, flag) => total + severityWeight(flag.severity), 0),
      anomalyCount: dayFlags.length,
      severityBreakdown,
      types: Array.from(new Set(dayFlags.map((flag) => getAnomalyCategory(flag.type)))),
      summaries: Array.from(new Set(dayFlags.map((flag) => flag.title)))
    };
  });

  return {
    categories: anomalyCategoryOptions,
    days,
    filter: {
      category,
      categoryLabel: formatCategoryLabel(category),
      range
    },
    range: {
      endDay: formatDate(endDay),
      startDay: formatDate(startDay)
    }
  };
}
