CREATE TYPE "SyncSource_new" AS ENUM ('oura', 'apple_health');

ALTER TABLE "SyncRun"
    ALTER COLUMN "source" TYPE "SyncSource_new"
    USING ("source"::text::"SyncSource_new");

ALTER TABLE "WorkoutSession"
    ALTER COLUMN "source" TYPE "SyncSource_new"
    USING ("source"::text::"SyncSource_new");

DROP TYPE "SyncSource";
ALTER TYPE "SyncSource_new" RENAME TO "SyncSource";

CREATE TABLE "AppleHealthSyncBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "SyncSource" NOT NULL DEFAULT 'apple_health',
    "status" "SyncStatus" NOT NULL,
    "clientSyncedThrough" TIMESTAMP(3),
    "deviceName" TEXT,
    "deviceModel" TEXT,
    "deviceSystemVersion" TEXT,
    "appVersion" TEXT,
    "bundleIdentifier" TEXT,
    "receivedRecordCount" INTEGER NOT NULL,
    "storedRecordCount" INTEGER NOT NULL,
    "upsertedRecordCount" INTEGER NOT NULL,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "warnings" JSONB,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "AppleHealthSyncBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppleHealthRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "syncBatchId" TEXT,
    "source" "SyncSource" NOT NULL DEFAULT 'apple_health',
    "recordType" TEXT NOT NULL,
    "externalId" TEXT,
    "fallbackKey" TEXT NOT NULL,
    "ingestKey" TEXT NOT NULL,
    "sourceBundleId" TEXT,
    "sourceName" TEXT,
    "sourceProductType" TEXT,
    "unit" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "day" TIMESTAMP(3) NOT NULL,
    "numericValue" DOUBLE PRECISION,
    "categoricalValue" TEXT,
    "metadata" JSONB,
    "routePayload" JSONB,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppleHealthRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppleHealthRecord_ingestKey_key" ON "AppleHealthRecord"("ingestKey");
CREATE INDEX "AppleHealthSyncBatch_userId_createdAt_idx" ON "AppleHealthSyncBatch"("userId", "createdAt");
CREATE INDEX "AppleHealthSyncBatch_status_createdAt_idx" ON "AppleHealthSyncBatch"("status", "createdAt");
CREATE INDEX "AppleHealthRecord_userId_day_idx" ON "AppleHealthRecord"("userId", "day");
CREATE INDEX "AppleHealthRecord_userId_recordType_day_idx" ON "AppleHealthRecord"("userId", "recordType", "day");
CREATE INDEX "AppleHealthRecord_recordType_externalId_idx" ON "AppleHealthRecord"("recordType", "externalId");

ALTER TABLE "AppleHealthSyncBatch" ADD CONSTRAINT "AppleHealthSyncBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppleHealthRecord" ADD CONSTRAINT "AppleHealthRecord_syncBatchId_fkey" FOREIGN KEY ("syncBatchId") REFERENCES "AppleHealthSyncBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppleHealthRecord" ADD CONSTRAINT "AppleHealthRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
