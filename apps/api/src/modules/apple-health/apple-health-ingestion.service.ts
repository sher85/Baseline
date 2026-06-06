import { createHash } from "node:crypto";

import { env } from "../../config/env.js";
import { Prisma, SyncSource, SyncStatus } from "../../lib/prisma-client.js";
import { prisma } from "../../lib/prisma.js";
import { getOrCreatePrimaryUser } from "../auth/single-user.service.js";
import {
  addDays,
  asUtcDate,
  formatDate
} from "../activity/activity-utils.js";

type AppleHealthSourcePayload = {
  bundleIdentifier?: string | undefined;
  name?: string | undefined;
  productType?: string | undefined;
};

type AppleHealthWorkoutPayload = {
  activityType: string;
  endTime: string;
  externalId?: string | undefined;
  label?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
  route?: Array<{
    altitudeMeters?: number | null | undefined;
    horizontalAccuracyMeters?: number | null | undefined;
    latitude: number;
    longitude: number;
    timestamp: string;
  }> | undefined;
  source?: AppleHealthSourcePayload | undefined;
  startTime: string;
  totalActiveEnergyCalories?: number | null | undefined;
  totalDistanceMeters?: number | null | undefined;
};

type AppleHealthQuantityPayload = {
  endTime?: string | undefined;
  externalId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  sampleType: string;
  source?: AppleHealthSourcePayload | undefined;
  startTime: string;
  unit: string;
  value: number;
};

type AppleHealthCategoryPayload = {
  categoryType: string;
  endTime: string;
  externalId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  source?: AppleHealthSourcePayload | undefined;
  startTime: string;
  value: string;
};

type AppleHealthIngestPayload = {
  clientSyncedThrough?: string | undefined;
  device?: {
    appVersion?: string | undefined;
    bundleIdentifier?: string | undefined;
    model?: string | undefined;
    name?: string | undefined;
    systemVersion?: string | undefined;
  } | undefined;
  records: {
    categories: AppleHealthCategoryPayload[];
    quantities: AppleHealthQuantityPayload[];
    workouts: AppleHealthWorkoutPayload[];
  };
};

export class AppleHealthIngestError extends Error {
  constructor(
    message: string,
    readonly batchId: string
  ) {
    super(message);
    this.name = "AppleHealthIngestError";
  }
}

type AppleHealthFlatRecord = {
  rawPayload: Record<string, unknown>;
  recordType: string;
  externalId?: string | undefined;
  fallbackKey: string;
  startTime: string;
  endTime?: string | undefined;
  numericValue?: number | null | undefined;
  categoricalValue?: string | null | undefined;
  unit?: string | undefined;
  source?: AppleHealthSourcePayload | undefined;
  metadata?: Record<string, unknown> | undefined;
  routePayload?: unknown;
};

export function createFallbackKey(parts: Array<string | number | null | undefined>) {
  const digest = createHash("sha256");

  digest.update(parts.map((part) => String(part ?? "")).join("|"));

  return digest.digest("hex");
}

export function buildIngestKey(
  recordType: string,
  externalId: string | undefined,
  fallbackKey: string
) {
  return externalId ? `${recordType}:${externalId}` : `${recordType}:fallback:${fallbackKey}`;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function toNullableJsonValue(value: unknown): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function countReceivedRecords(payload: AppleHealthIngestPayload) {
  return (
    payload.records.workouts.length +
    payload.records.quantities.length +
    payload.records.categories.length
  );
}

function flattenRecords(payload: AppleHealthIngestPayload): AppleHealthFlatRecord[] {
  const workoutRecords = payload.records.workouts.map((record) => ({
    recordType: "workout",
    externalId: record.externalId,
    fallbackKey: createFallbackKey([
      "workout",
      record.activityType,
      record.startTime,
      record.endTime,
      record.totalActiveEnergyCalories,
      record.totalDistanceMeters
    ]),
    startTime: record.startTime,
    endTime: record.endTime,
    numericValue: record.totalActiveEnergyCalories ?? null,
    unit: "kcal",
    source: record.source,
    metadata: {
      ...(record.metadata ?? {}),
      activityType: record.activityType,
      label: record.label ?? null,
      totalDistanceMeters: record.totalDistanceMeters ?? null
    },
    routePayload: record.route ?? null,
    rawPayload: record as unknown as Record<string, unknown>
  }));

  const quantityRecords = payload.records.quantities.map((record) => ({
    recordType: record.sampleType,
    externalId: record.externalId,
    fallbackKey: createFallbackKey([
      record.sampleType,
      record.startTime,
      record.endTime,
      record.value,
      record.unit
    ]),
    startTime: record.startTime,
    endTime: record.endTime,
    numericValue: record.value,
    unit: record.unit,
    source: record.source,
    metadata: record.metadata,
    rawPayload: record as unknown as Record<string, unknown>
  }));

  const categoryRecords = payload.records.categories.map((record) => ({
    recordType: record.categoryType,
    externalId: record.externalId,
    fallbackKey: createFallbackKey([
      record.categoryType,
      record.startTime,
      record.endTime,
      record.value
    ]),
    startTime: record.startTime,
    endTime: record.endTime,
    categoricalValue: record.value,
    source: record.source,
    metadata: record.metadata,
    rawPayload: record as unknown as Record<string, unknown>
  }));

  return [...workoutRecords, ...quantityRecords, ...categoryRecords];
}

function extractWorkoutFields(record: AppleHealthRecordLike) {
  const metadata = (record.metadata ?? {}) as Record<string, unknown>;
  const activityType = typeof metadata.activityType === "string" ? metadata.activityType : "workout";
  const label = typeof metadata.label === "string" ? metadata.label : null;
  const distanceMeters =
    typeof metadata.totalDistanceMeters === "number" ? metadata.totalDistanceMeters : null;

  return {
    activityType,
    label,
    distanceMeters
  };
}

type AppleHealthRecordLike = {
  endTime: Date | null;
  externalId: string | null;
  fallbackKey: string;
  metadata: unknown;
  numericValue: number | null;
  rawPayload: unknown;
  routePayload: unknown;
  sourceBundleId: string | null;
  sourceName: string | null;
  sourceProductType: string | null;
  startTime: Date;
};

async function upsertWorkoutSessions(records: AppleHealthRecordLike[], userId: string) {
  await Promise.all(
    records.map((record) => {
      const workout = extractWorkoutFields(record);
      const externalId = record.externalId ?? `fallback:${record.fallbackKey}`;
      const startDay = formatDate(record.startTime);
      const durationSeconds = record.endTime
        ? Math.max(
            0,
            Math.round((record.endTime.getTime() - record.startTime.getTime()) / 1000)
          )
        : null;

      return prisma.workoutSession.upsert({
        where: {
          source_externalId: {
            source: SyncSource.apple_health,
            externalId
          }
        },
        update: {
          day: asUtcDate(startDay),
          activityType: workout.activityType,
          label: workout.label,
          startTime: record.startTime,
          endTime: record.endTime,
          durationSeconds,
          calories: record.numericValue === null ? null : Math.round(record.numericValue),
          distanceMeters: workout.distanceMeters,
          sourceType: record.sourceBundleId ?? record.sourceName,
          intensity: null
        },
        create: {
          userId,
          source: SyncSource.apple_health,
          externalId,
          day: asUtcDate(startDay),
          activityType: workout.activityType,
          label: workout.label,
          startTime: record.startTime,
          endTime: record.endTime,
          durationSeconds,
          calories: record.numericValue === null ? null : Math.round(record.numericValue),
          distanceMeters: workout.distanceMeters,
          sourceType: record.sourceBundleId ?? record.sourceName,
          intensity: null
        }
      });
    })
  );
}

export async function ingestAppleHealthBatch(payload: AppleHealthIngestPayload) {
  const user = await getOrCreatePrimaryUser();
  const flatRecords = flattenRecords(payload);
  const receivedRecordCount = flatRecords.length;
  const warnings: string[] = [];

  const batch = await prisma.appleHealthSyncBatch.create({
    data: {
      userId: user.id,
      status: SyncStatus.running,
      clientSyncedThrough: payload.clientSyncedThrough
        ? new Date(payload.clientSyncedThrough)
        : null,
      deviceName: payload.device?.name ?? null,
      deviceModel: payload.device?.model ?? null,
      deviceSystemVersion: payload.device?.systemVersion ?? null,
      appVersion: payload.device?.appVersion ?? null,
      bundleIdentifier: payload.device?.bundleIdentifier ?? null,
      receivedRecordCount,
      storedRecordCount: 0,
      upsertedRecordCount: 0,
      payload: payload as unknown as object
    }
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
      let storedRecordCount = 0;
      let upsertedRecordCount = 0;
      const workoutRecords: AppleHealthRecordLike[] = [];

      for (const record of flatRecords) {
        const startTime = new Date(record.startTime);
        const endTime = record.endTime ? new Date(record.endTime) : null;
        const ingestKey = buildIngestKey(
          record.recordType,
          record.externalId,
          record.fallbackKey
        );
        const existing = await tx.appleHealthRecord.findUnique({
          where: {
            ingestKey
          }
        });

        const upserted = await tx.appleHealthRecord.upsert({
          where: {
            ingestKey
          },
          update: {
            syncBatchId: batch.id,
            sourceBundleId: record.source?.bundleIdentifier ?? null,
            sourceName: record.source?.name ?? null,
            sourceProductType: record.source?.productType ?? null,
            unit: record.unit ?? null,
            startTime,
            endTime,
            day: asUtcDate(formatDate(startTime)),
            numericValue: record.numericValue ?? null,
            categoricalValue: record.categoricalValue ?? null,
            metadata: toNullableJsonValue(record.metadata),
            routePayload: toNullableJsonValue(record.routePayload),
            rawPayload: toJsonValue(record.rawPayload)
          },
          create: {
            userId: user.id,
            syncBatchId: batch.id,
            source: SyncSource.apple_health,
            recordType: record.recordType,
            externalId: record.externalId ?? null,
            fallbackKey: record.fallbackKey,
            ingestKey,
            sourceBundleId: record.source?.bundleIdentifier ?? null,
            sourceName: record.source?.name ?? null,
            sourceProductType: record.source?.productType ?? null,
            unit: record.unit ?? null,
            startTime,
            endTime,
            day: asUtcDate(formatDate(startTime)),
            numericValue: record.numericValue ?? null,
            categoricalValue: record.categoricalValue ?? null,
            metadata: toNullableJsonValue(record.metadata),
            routePayload: toNullableJsonValue(record.routePayload),
            rawPayload: toJsonValue(record.rawPayload)
          }
        });

        if (existing) {
          upsertedRecordCount += 1;
        } else {
          storedRecordCount += 1;
        }

        if (upserted.recordType === "workout") {
          workoutRecords.push(upserted);
        }
      }

      await upsertWorkoutSessions(workoutRecords, user.id);

      return {
        storedRecordCount,
        upsertedRecordCount
      };
    }, {
      maxWait: 10_000,
      timeout: 120_000
    });

    const completedBatch = await prisma.appleHealthSyncBatch.update({
      where: {
        id: batch.id
      },
      data: {
        status: SyncStatus.succeeded,
        storedRecordCount: result.storedRecordCount,
        upsertedRecordCount: result.upsertedRecordCount,
        warningCount: warnings.length,
        warnings,
        processedAt: new Date()
      }
    });

    return {
      success: true as const,
      batchId: completedBatch.id,
      receivedRecordCount,
      storedRecordCount: result.storedRecordCount,
      upsertedRecordCount: result.upsertedRecordCount,
      duplicateCount: Math.max(
        0,
        receivedRecordCount - result.storedRecordCount - result.upsertedRecordCount
      ),
      serverSyncedAt: (completedBatch.processedAt ?? new Date()).toISOString(),
      warnings
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingest error";

    await prisma.appleHealthSyncBatch.update({
      where: {
        id: batch.id
      },
      data: {
        status: SyncStatus.failed,
        errorMessage: message.slice(0, 1_000),
        warningCount: warnings.length,
        warnings,
        processedAt: new Date()
      }
    });

    throw new AppleHealthIngestError(message, batch.id);
  }
}

export async function getAppleHealthStatus() {
  const user = await getOrCreatePrimaryUser();
  const [latestBatch, latestSuccessfulBatch] = await Promise.all([
    prisma.appleHealthSyncBatch.findFirst({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.appleHealthSyncBatch.findFirst({
      where: {
        userId: user.id,
        status: SyncStatus.succeeded
      },
      orderBy: {
        processedAt: "desc"
      }
    })
  ]);

  return {
    provider: "apple_health" as const,
    configured: Boolean(env.API_TOKEN),
    latestSyncAt: latestBatch?.processedAt?.toISOString() ?? latestBatch?.createdAt.toISOString() ?? null,
    latestSuccessfulSyncAt: latestSuccessfulBatch?.processedAt?.toISOString() ?? null,
    latestStatus: latestBatch?.status ?? "idle",
    lastErrorMessage: latestBatch?.errorMessage ?? null,
    latestReceivedRecordCount: latestBatch?.receivedRecordCount ?? 0,
    latestStoredRecordCount:
      (latestBatch?.storedRecordCount ?? 0) + (latestBatch?.upsertedRecordCount ?? 0)
  };
}

export async function getAppleHealthActivitySnapshots(dayCount = 30) {
  const user = await getOrCreatePrimaryUser();
  const latestDayRecord = await prisma.appleHealthRecord.findFirst({
    where: {
      userId: user.id,
      recordType: {
        in: ["step_count", "active_energy_burned", "workout"]
      }
    },
    orderBy: {
      day: "desc"
    }
  });

  if (!latestDayRecord) {
    return null;
  }

  const latestDay = formatDate(latestDayRecord.day);
  const startDay = addDays(latestDay, -(dayCount - 1));
  const records = await prisma.appleHealthRecord.findMany({
    where: {
      userId: user.id,
      day: {
        gte: asUtcDate(startDay),
        lt: asUtcDate(addDays(latestDay, 1))
      },
      recordType: {
        in: ["step_count", "active_energy_burned"]
      }
    }
  });

  const byDay = new Map<string, { activeCalories: number; steps: number }>();

  for (const record of records) {
    const key = formatDate(record.day);
    const entry = byDay.get(key) ?? {
      activeCalories: 0,
      steps: 0
    };

    if (record.recordType === "step_count") {
      entry.steps += Math.round(record.numericValue ?? 0);
    }

    if (record.recordType === "active_energy_burned") {
      entry.activeCalories += Math.round(record.numericValue ?? 0);
    }

    byDay.set(key, entry);
  }

  return {
    latestDay,
    days: byDay
  };
}

export function shouldUseAppleHealthActivitySources(workoutCount: number, snapshotDays: number) {
  return workoutCount > 0 || snapshotDays > 0;
}
